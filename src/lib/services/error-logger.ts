import type { SupabaseClient } from "../../db/supabase.client";

export type TypedSupabase = SupabaseClient;

export interface ErrorLogEntry {
  level: "error" | "warn" | "info";
  message: string;
  context?: string;
  userId?: string;
  requestId?: string;
  error?: Error;
  metadata?: Record<string, any>;
  timestamp: Date;
}

export interface OpenRouterErrorLog extends ErrorLogEntry {
  service: "openrouter";
  model?: string;
  apiEndpoint?: string;
  responseTime?: number;
  retryCount?: number;
  rateLimitInfo?: {
    remaining: number;
    resetTime: number;
  };
}

export interface AIErrorLog extends ErrorLogEntry {
  service: "ai";
  operation: "generate" | "translate" | "grammar" | "vocabulary" | "analysis";
  inputLength?: number;
  model?: string;
  fallbackUsed?: boolean;
}

// ============================================================================
// ERROR LOGGING FUNCTIONS
// ============================================================================

export function logError(
  level: ErrorLogEntry["level"],
  message: string,
  context?: string,
  metadata?: Record<string, any>
): void {
  const entry: ErrorLogEntry = {
    level,
    message,
    context,
    metadata,
    timestamp: new Date(),
  };

  // Console logging
  const logMethod = level === "error" ? console.error : level === "warn" ? console.warn : console.info;
  logMethod(`[${level.toUpperCase()}] ${context ? `[${context}] ` : ""}${message}`, metadata);

  // TODO: Add integration with external logging services
  // - Sentry for error tracking
  // - LogRocket for session replay
  // - Custom logging endpoint
}

export function logOpenRouterError(
  error: Error,
  context: string,
  metadata?: {
    model?: string;
    apiEndpoint?: string;
    responseTime?: number;
    retryCount?: number;
    rateLimitInfo?: {
      remaining: number;
      resetTime: number;
    };
  }
): void {
  const entry: OpenRouterErrorLog = {
    level: "error",
    message: error.message,
    context,
    service: "openrouter",
    error,
    metadata,
    timestamp: new Date(),
    ...metadata,
  };

  // Enhanced console logging for OpenRouter errors
  console.error("OpenRouter Error:", {
    message: error.message,
    context,
    timestamp: entry.timestamp.toISOString(),
    stack: error.stack,
    ...metadata,
  });

  // Log to Supabase if available
  logToSupabase(entry).catch(console.error);
}

export function logAIError(
  error: Error,
  operation: AIErrorLog["operation"],
  context: string,
  metadata?: {
    userId?: string;
    requestId?: string;
    inputLength?: number;
    model?: string;
    fallbackUsed?: boolean;
  }
): void {
  const entry: AIErrorLog = {
    level: "error",
    message: error.message,
    context,
    service: "ai",
    operation,
    error,
    metadata,
    timestamp: new Date(),
    ...metadata,
  };

  // Enhanced console logging for AI errors
  console.error("AI Service Error:", {
    operation,
    message: error.message,
    context,
    timestamp: entry.timestamp.toISOString(),
    stack: error.stack,
    ...metadata,
  });

  // Log to Supabase if available
  logToSupabase(entry).catch(console.error);
}

export function logOpenRouterSuccess(
  operation: string,
  metadata: {
    model: string;
    responseTime: number;
    tokensUsed?: number;
    userId?: string;
    requestId?: string;
  }
): void {
  const entry: ErrorLogEntry = {
    level: "info",
    message: `OpenRouter ${operation} completed successfully`,
    context: "openrouter",
    metadata,
    timestamp: new Date(),
  };

  // Log success metrics
  console.info("OpenRouter Success:", {
    operation,
    model: metadata.model,
    responseTime: `${metadata.responseTime}ms`,
    tokensUsed: metadata.tokensUsed,
    timestamp: entry.timestamp.toISOString(),
  });

  // Log to Supabase if available
  logToSupabase(entry).catch(console.error);
}

export function logAISuccess(
  operation: AIErrorLog["operation"],
  metadata: {
    userId?: string;
    requestId?: string;
    inputLength: number;
    outputLength: number;
    model?: string;
    processingTime: number;
  }
): void {
  const entry: ErrorLogEntry = {
    level: "info",
    message: `AI ${operation} completed successfully`,
    context: "ai",
    metadata,
    timestamp: new Date(),
  };

  // Log success metrics
  console.info("AI Success:", {
    operation,
    inputLength: metadata.inputLength,
    outputLength: metadata.outputLength,
    processingTime: `${metadata.processingTime}ms`,
    model: metadata.model,
    timestamp: entry.timestamp.toISOString(),
  });

  // Log to Supabase if available
  logToSupabase(entry).catch(console.error);
}

// ============================================================================
// RATE LIMITING AND PERFORMANCE MONITORING
// ============================================================================

export function logRateLimitHit(userId: string, endpoint: string, limit: number, windowMs: number): void {
  const entry: ErrorLogEntry = {
    level: "warn",
    message: `Rate limit hit for user ${userId} on ${endpoint}`,
    context: "rate-limit",
    metadata: {
      userId,
      endpoint,
      limit,
      windowMs,
      resetTime: Date.now() + windowMs,
    },
    timestamp: new Date(),
  };

  console.warn("Rate Limit Hit:", entry.metadata);
  logToSupabase(entry).catch(console.error);
}

export function logPerformanceMetrics(
  operation: string,
  metrics: {
    responseTime: number;
    memoryUsage?: number;
    cpuUsage?: number;
    userId?: string;
    requestId?: string;
  }
): void {
  const entry: ErrorLogEntry = {
    level: "info",
    message: `Performance metrics for ${operation}`,
    context: "performance",
    metadata: metrics,
    timestamp: new Date(),
  };

  // Log performance metrics
  console.info("Performance Metrics:", {
    operation,
    responseTime: `${metrics.responseTime}ms`,
    memoryUsage: metrics.memoryUsage ? `${Math.round(metrics.memoryUsage / 1024 / 1024)}MB` : undefined,
    timestamp: entry.timestamp.toISOString(),
  });

  // Log to Supabase if available
  logToSupabase(entry).catch(console.error);
}

// ============================================================================
// SUPABASE INTEGRATION
// ============================================================================

async function logToSupabase(entry: ErrorLogEntry): Promise<void> {
  // This function would integrate with Supabase to store error logs
  // For now, it's a placeholder that could be implemented later
  // Example implementation:
  // const supabase = getSupabaseClient();
  // await supabase.from('error_logs').insert({
  //   level: entry.level,
  //   message: entry.message,
  //   context: entry.context,
  //   user_id: entry.userId,
  //   request_id: entry.requestId,
  //   metadata: entry.metadata,
  //   timestamp: entry.timestamp.toISOString()
  // });
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

export function createErrorContext(operation: string, additionalContext?: string): string {
  return `[${operation}]${additionalContext ? ` ${additionalContext}` : ""}`;
}

export function sanitizeErrorForLogging(error: Error): Error {
  // Remove sensitive information from error messages
  const sanitizedError = new Error(error.message);
  sanitizedError.name = error.name;
  sanitizedError.stack = error.stack;

  // Remove API keys from error messages
  sanitizedError.message = sanitizedError.message.replace(/sk-[a-zA-Z0-9]{20,}/g, "sk-***");

  return sanitizedError;
}

export function formatErrorForUser(error: Error): string {
  // Convert technical errors to user-friendly messages
  if (error.message.includes("Rate limit")) {
    return "Przekroczono limit żądań. Spróbuj ponownie za chwilę.";
  }

  if (error.message.includes("Invalid API key")) {
    return "Błąd konfiguracji usługi. Skontaktuj się z administratorem.";
  }

  if (error.message.includes("Network error")) {
    return "Błąd połączenia sieciowego. Sprawdź swoje połączenie internetowe.";
  }

  if (error.message.includes("timeout")) {
    return "Żądanie przekroczyło limit czasu. Spróbuj ponownie.";
  }

  return "Wystąpił nieoczekiwany błąd. Spróbuj ponownie później.";
}
