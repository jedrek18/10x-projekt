import { z } from "zod";

// ============================================================================
// INTERFACES AND TYPES
// ============================================================================

export interface OpenRouterConfig {
  apiKey: string;
  baseUrl?: string;
  defaultModel?: string;
  systemMessage?: string;
  timeout?: number;
  maxRetries?: number;
  enableCache?: boolean;
  cacheTtl?: number;
}

export interface MessageRequest {
  userMessage: string;
  systemMessage?: string;
  model?: string;
  responseFormat?: ResponseFormat;
  parameters?: ModelParameters;
  conversationId?: string;
}

export interface StreamMessageRequest extends MessageRequest {
  stream?: boolean;
}

export interface ResponseFormat {
  type: "json_schema";
  json_schema: {
    name: string;
    strict: boolean;
    schema: object;
  };
}

export interface ModelParameters {
  temperature?: number;
  max_tokens?: number;
  top_p?: number;
  frequency_penalty?: number;
  presence_penalty?: number;
}

export interface ConversationMessage {
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: number;
}

export interface CachedResponse {
  data: OpenRouterResponse;
  timestamp: number;
  ttl: number;
}

export interface OpenRouterResponse {
  choices: {
    message: {
      content: string;
      role: string;
    };
    finish_reason: string;
    index: number;
  }[];
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  model: string;
  id: string;
  created: number;
}

export interface OpenRouterStreamChunk {
  choices: {
    delta: {
      content?: string;
      role?: string;
    };
    finish_reason: string | null;
    index: number;
  }[];
  model: string;
  id: string;
  created: number;
}

// ============================================================================
// ERROR CLASSES
// ============================================================================

export class OpenRouterError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode?: number,
    public retryable = false
  ) {
    super(message);
    this.name = "OpenRouterError";
  }
}

export class ValidationError extends OpenRouterError {
  constructor(message: string) {
    super(message, "VALIDATION_ERROR", 400, false);
  }
}

export class AuthenticationError extends OpenRouterError {
  constructor(message: string) {
    super(message, "AUTHENTICATION_ERROR", 401, false);
  }
}

export class RateLimitError extends OpenRouterError {
  constructor(
    message: string,
    public retryAfter?: number
  ) {
    super(message, "RATE_LIMIT_ERROR", 429, true);
  }
}

export class ModelUnavailableError extends OpenRouterError {
  constructor(model: string) {
    super(`Model ${model} is not available`, "MODEL_UNAVAILABLE", 400, false);
  }
}

// ============================================================================
// MAIN SERVICE CLASS
// ============================================================================

export class OpenRouterService {
  // Private fields
  private apiKey: string;
  private baseUrl: string;
  private defaultModel: string;
  private systemMessage: string;
  private timeout: number;
  private maxRetries: number;
  private cache: Map<string, CachedResponse>;
  private cacheTtl: number;
  private conversationHistory: ConversationMessage[];
  private currentModelParameters: ModelParameters;
  private currentResponseFormat?: ResponseFormat;
  private rateLimiter: Map<string, { count: number; resetTime: number }>;

  constructor(config: OpenRouterConfig) {
    // Validate API key
    if (!this.validateApiKey(config.apiKey)) {
      throw new ValidationError("Invalid API key format");
    }

    // Initialize fields with defaults
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl || "https://openrouter.ai/api/v1";
    this.defaultModel = config.defaultModel || "openai/gpt-4o-mini";
    this.systemMessage = config.systemMessage || "You are a helpful assistant.";
    this.timeout = config.timeout || 120000; // Zwiększamy timeout do 2 minut
    this.maxRetries = config.maxRetries || 3;
    this.cacheTtl = config.cacheTtl || 3600;
    this.cache = new Map();
    this.conversationHistory = [];
    this.currentModelParameters = {};
    this.rateLimiter = new Map();

    // Enable cache if specified
    if (config.enableCache !== false) {
      this.enableCache(this.cacheTtl);
    }
  }

  // ============================================================================
  // PUBLIC METHODS
  // ============================================================================

  /**
   * Send a message to OpenRouter API
   */
  async sendMessage(request: MessageRequest): Promise<OpenRouterResponse> {
    // Validate input
    this.validateUserInput(request.userMessage);

    // Check rate limit
    const userId = request.conversationId || "default";
    if (!this.checkRateLimit(userId)) {
      throw new RateLimitError("Rate limit exceeded. Please try again later.");
    }

    // Generate cache key and check cache
    const cacheKey = this.generateCacheKey(request);
    const cached = this.cache.get(cacheKey);
    if (cached && this.isCacheValid(cached)) {
      console.log("OpenRouter Service: Using cached response");
      return cached.data;
    }
    console.log("OpenRouter Service: Cache miss, making API request");

    // Build request
    const headers = this.buildRequestHeaders();
    const body = this.buildRequestBody(request);

    // Send request with retry logic
    const response = await this.retryWithBackoff(async () => {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: "POST",
        headers,
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(this.timeout),
      });

      if (!response.ok) {
        await this.handleApiError(response);
      }

      return response;
    });

    // Process response
    const result = await this.handleApiResponse(response);

    // Cache result
    if (this.cacheTtl > 0) {
      console.log("OpenRouter Service: Caching response");
      this.cache.set(cacheKey, {
        data: result,
        timestamp: Date.now(),
        ttl: this.cacheTtl * 1000,
      });
    }

    // Add to conversation history
    this.addToConversation(request.userMessage, "user");
    if (result.choices[0]?.message?.content) {
      this.addToConversation(result.choices[0].message.content, "assistant");
    }

    return result;
  }

  /**
   * Send a message to OpenRouter API with streaming support
   */
  async sendMessageStream(request: StreamMessageRequest): Promise<ReadableStream<Uint8Array>> {
    // Validate input
    this.validateUserInput(request.userMessage);

    // Check rate limit
    const userId = request.conversationId || "default";
    if (!this.checkRateLimit(userId)) {
      throw new RateLimitError("Rate limit exceeded. Please try again later.");
    }

    // Build request with stream: true
    const headers = this.buildRequestHeaders();
    const body = this.buildRequestBody({ ...request, stream: true });

    // Send request with retry logic
    const response = await this.retryWithBackoff(async () => {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: "POST",
        headers,
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(this.timeout),
      });

      if (!response.ok) {
        await this.handleApiError(response);
      }

      return response;
    });

    // Return the response body as a readable stream
    if (!response.body) {
      throw new OpenRouterError("No response body received", "NO_BODY");
    }
    return response.body;
  }

  /**
   * Set system message
   */
  setSystemMessage(message: string): void {
    if (!message || message.trim().length === 0) {
      throw new ValidationError("System message cannot be empty");
    }
    this.systemMessage = message.trim();
  }

  /**
   * Set default model
   */
  setDefaultModel(model: string): void {
    if (!model || model.trim().length === 0) {
      throw new ValidationError("Model name cannot be empty");
    }
    this.defaultModel = model.trim();
  }

  /**
   * Set model parameters
   */
  setModelParameters(parameters: ModelParameters): void {
    this.currentModelParameters = { ...parameters };
  }

  /**
   * Set response format
   */
  setResponseFormat(format: ResponseFormat): void {
    this.currentResponseFormat = format;
  }

  /**
   * Add message to conversation history
   */
  addToConversation(message: string, role: "user" | "assistant"): void {
    this.conversationHistory.push({
      role,
      content: message,
      timestamp: Date.now(),
    });
  }

  /**
   * Clear conversation history
   */
  clearConversation(): void {
    this.conversationHistory = [];
  }

  /**
   * Get conversation history
   */
  getConversationHistory(): ConversationMessage[] {
    return [...this.conversationHistory];
  }

  /**
   * Enable cache with optional TTL
   */
  enableCache(ttl?: number): void {
    this.cacheTtl = ttl || 3600;
  }

  /**
   * Disable cache
   */
  disableCache(): void {
    this.cacheTtl = 0;
    this.cache.clear();
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    console.log("OpenRouter Service: Clearing cache");
    this.cache.clear();
  }

  // ============================================================================
  // PRIVATE METHODS
  // ============================================================================

  private validateApiKey(apiKey: string): boolean {
    return apiKey && apiKey.trim().length > 0 && apiKey.startsWith("sk-");
  }

  private validateUserInput(input: string): boolean {
    if (!input || input.trim().length === 0) {
      throw new ValidationError("User message cannot be empty");
    }

    if (input.length > 10000) {
      throw new ValidationError("User message too long (max 10000 characters)");
    }

    // Check for potentially dangerous content
    const dangerousPatterns = ["__proto__", "constructor", "prototype"];
    for (const pattern of dangerousPatterns) {
      if (input.toLowerCase().includes(pattern)) {
        throw new ValidationError("Invalid input content detected");
      }
    }

    return true;
  }

  private buildRequestHeaders(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://10x-projekt.vercel.app",
      "X-Title": "10x Projekt - Language Learning App",
    };
  }

  private buildRequestBody(request: MessageRequest | StreamMessageRequest): object {
    const messages = [];

    // Add system message
    if (request.systemMessage || this.systemMessage) {
      messages.push({
        role: "system",
        content: request.systemMessage || this.systemMessage,
      });
    }

    // Add conversation history
    for (const msg of this.conversationHistory.slice(-10)) {
      // Keep last 10 messages
      messages.push({
        role: msg.role,
        content: msg.content,
      });
    }

    // Add current user message
    messages.push({
      role: "user",
      content: request.userMessage,
    });

    const body: any = {
      model: request.model || this.defaultModel,
      messages,
      ...this.currentModelParameters,
    };

    // Add response format if specified
    if (request.responseFormat || this.currentResponseFormat) {
      body.response_format = request.responseFormat || this.currentResponseFormat;
    }

    // Add stream parameter if specified
    if ("stream" in request && request.stream) {
      body.stream = true;
    }

    console.log("OpenRouter request body:", JSON.stringify(body, null, 2));
    return body;
  }

  private async handleApiResponse(response: Response): Promise<OpenRouterResponse> {
    const text = await response.text();
    console.log("OpenRouter raw response:", text);

    try {
      const data = JSON.parse(text);
      console.log("OpenRouter parsed response:", JSON.stringify(data, null, 2));

      if (!data.choices || !Array.isArray(data.choices)) {
        console.error("Invalid response format - no choices array");
        throw new OpenRouterError("Invalid response format from API", "INVALID_RESPONSE");
      }

      if (!data.choices[0]?.message?.content) {
        console.error("Invalid response format - no message content");
        throw new OpenRouterError("No message content in API response", "INVALID_RESPONSE");
      }

      return data as OpenRouterResponse;
    } catch (error) {
      if (error instanceof OpenRouterError) {
        throw error;
      }
      console.error("Failed to parse OpenRouter response:", error);
      throw new OpenRouterError(`Failed to parse API response: ${error}`, "PARSE_ERROR");
    }
  }

  private async handleApiError(response: Response): Promise<never> {
    const status = response.status;
    let errorMessage: string;
    let retryable = false;

    try {
      const errorData = await response.json();
      errorMessage = errorData.error?.message || `HTTP ${status}`;
    } catch {
      errorMessage = `HTTP ${status}`;
    }

    switch (status) {
      case 401:
        throw new AuthenticationError("Invalid API key");
      case 429:
        const retryAfter = response.headers.get("retry-after");
        throw new RateLimitError(errorMessage, retryAfter ? parseInt(retryAfter) : undefined);
      case 400:
        if (errorMessage.includes("model")) {
          throw new ModelUnavailableError(this.defaultModel);
        }
        throw new ValidationError(errorMessage);
      case 500:
      case 502:
      case 503:
      case 504:
        retryable = true;
        throw new OpenRouterError(errorMessage, "SERVER_ERROR", status, retryable);
      default:
        throw new OpenRouterError(errorMessage, "API_ERROR", status, false);
    }
  }

  private generateCacheKey(request: MessageRequest): string {
    const key = JSON.stringify({
      userMessage: request.userMessage,
      systemMessage: request.systemMessage || this.systemMessage,
      model: request.model || this.defaultModel,
      parameters: request.parameters || this.currentModelParameters,
      responseFormat: request.responseFormat || this.currentResponseFormat,
    });
    // Używamy Buffer zamiast btoa dla obsługi Unicode
    return Buffer.from(key).toString("base64").slice(0, 50); // Truncate to reasonable length
  }

  private isCacheValid(cached: CachedResponse): boolean {
    return Date.now() - cached.timestamp < cached.ttl;
  }

  private checkRateLimit(userId: string): boolean {
    const now = Date.now();
    const userLimit = this.rateLimiter.get(userId);

    if (!userLimit || now > userLimit.resetTime) {
      this.rateLimiter.set(userId, { count: 1, resetTime: now + 60000 }); // 1 minute window
      return true;
    }

    if (userLimit.count >= 10) {
      // 10 requests per minute
      return false;
    }

    userLimit.count++;
    return true;
  }

  private async retryWithBackoff<T>(fn: () => Promise<T>): Promise<T> {
    let lastError: Error;

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error as Error;

        // Don't retry non-retryable errors
        if (error instanceof OpenRouterError && !error.retryable) {
          throw error;
        }

        // Don't retry on last attempt
        if (attempt === this.maxRetries) {
          break;
        }

        // Exponential backoff
        const delay = Math.min(1000 * Math.pow(2, attempt), 10000);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }

    throw lastError!;
  }

  private logError(error: Error, context: string): void {
    console.error("OpenRouter Error:", {
      message: error.message,
      context,
      timestamp: new Date().toISOString(),
      stack: error.stack,
    });
  }
}
