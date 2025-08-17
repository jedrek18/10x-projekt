import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import {
  OpenRouterService,
  ValidationError,
  AuthenticationError,
  ModelUnavailableError,
  OpenRouterError,
} from "../src/lib/services/openrouter.service";

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe("OpenRouterService", () => {
  let service: OpenRouterService;
  const mockApiKey = "sk-test-key-1234567890";

  beforeEach(() => {
    vi.clearAllMocks();
    service = new OpenRouterService({
      apiKey: mockApiKey,
      defaultModel: "openai/gpt-4o-mini",
      maxRetries: 0, // Disable retries for tests to avoid timeouts
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("Constructor", () => {
    it("should initialize with valid config", () => {
      expect(service).toBeInstanceOf(OpenRouterService);
    });

    it("should throw ValidationError for invalid API key", () => {
      expect(() => {
        new OpenRouterService({ apiKey: "invalid-key" });
      }).toThrow(ValidationError);
    });

    it("should use default values when not provided", () => {
      const serviceWithDefaults = new OpenRouterService({ apiKey: mockApiKey });
      expect(serviceWithDefaults).toBeInstanceOf(OpenRouterService);
    });
  });

  describe("sendMessage", () => {
    it("should send message successfully", async () => {
      const mockResponse = {
        choices: [
          {
            message: { content: "Test response", role: "assistant" },
            finish_reason: "stop",
            index: 0,
          },
        ],
        model: "openai/gpt-4o-mini",
        id: "test-id",
        created: Date.now(),
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(JSON.stringify(mockResponse)),
      });

      const result = await service.sendMessage({
        userMessage: "Test message",
      });

      expect(result).toEqual(mockResponse);
      expect(mockFetch).toHaveBeenCalledWith(
        "https://openrouter.ai/api/v1/chat/completions",
        expect.objectContaining({
          method: "POST",
          headers: expect.objectContaining({
            Authorization: `Bearer ${mockApiKey}`,
            "Content-Type": "application/json",
          }),
          body: expect.stringContaining("Test message"),
        })
      );
    });

    it("should throw ValidationError for empty message", async () => {
      await expect(
        service.sendMessage({
          userMessage: "",
        })
      ).rejects.toThrow(ValidationError);
    });

    it("should throw ValidationError for message too long", async () => {
      const longMessage = "a".repeat(10001);
      await expect(
        service.sendMessage({
          userMessage: longMessage,
        })
      ).rejects.toThrow(ValidationError);
    });

    it("should throw ValidationError for dangerous content", async () => {
      await expect(
        service.sendMessage({
          userMessage: "test __proto__ test",
        })
      ).rejects.toThrow(ValidationError);
    });

    it("should handle authentication error", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: () => Promise.resolve({ error: { message: "Invalid API key" } }),
      });

      await expect(
        service.sendMessage({
          userMessage: "Test message",
        })
      ).rejects.toThrow(AuthenticationError);
    });

    it("should handle model unavailable error", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: () => Promise.resolve({ error: { message: "The model openai/gpt-4o-mini is not available" } }),
      });

      await expect(
        service.sendMessage({
          userMessage: "Test message",
        })
      ).rejects.toThrow(ModelUnavailableError);
    });

    it("should retry on server errors", async () => {
      // Create service with retries enabled for this test
      const serviceWithRetries = new OpenRouterService({
        apiKey: mockApiKey,
        defaultModel: "openai/gpt-4o-mini",
        maxRetries: 1,
      });

      const mockResponse = {
        choices: [
          {
            message: { content: "Test response", role: "assistant" },
            finish_reason: "stop",
            index: 0,
          },
        ],
        model: "openai/gpt-4o-mini",
        id: "test-id",
        created: Date.now(),
      };

      // First call fails, second succeeds
      mockFetch
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
          json: () => Promise.resolve({ error: { message: "Internal server error" } }),
        })
        .mockResolvedValueOnce({
          ok: true,
          text: () => Promise.resolve(JSON.stringify(mockResponse)),
        });

      const result = await serviceWithRetries.sendMessage({
        userMessage: "Test message",
      });

      expect(result).toEqual(mockResponse);
      expect(mockFetch).toHaveBeenCalledTimes(2);
    }, 15000); // Increase timeout for retry test

    it("should use cache for identical requests", async () => {
      const mockResponse = {
        choices: [
          {
            message: { content: "Test response", role: "assistant" },
            finish_reason: "stop",
            index: 0,
          },
        ],
        model: "openai/gpt-4o-mini",
        id: "test-id",
        created: Date.now(),
      };

      mockFetch.mockResolvedValue({
        ok: true,
        text: () => Promise.resolve(JSON.stringify(mockResponse)),
      });

      // First call
      const result1 = await service.sendMessage({
        userMessage: "Test message",
      });

      // Second call (should use cache)
      const result2 = await service.sendMessage({
        userMessage: "Test message",
      });

      expect(result1).toEqual(result2);
      expect(mockFetch).toHaveBeenCalledTimes(1); // Only called once due to cache
    });
  });

  describe("Configuration methods", () => {
    it("should set system message", () => {
      const newMessage = "New system message";
      service.setSystemMessage(newMessage);

      // We can't directly test private fields, but we can test the behavior
      expect(() => service.setSystemMessage("")).toThrow(ValidationError);
    });

    it("should set default model", () => {
      const newModel = "anthropic/claude-3-haiku";
      service.setDefaultModel(newModel);

      expect(() => service.setDefaultModel("")).toThrow(ValidationError);
    });

    it("should set model parameters", () => {
      const parameters = {
        temperature: 0.8,
        max_tokens: 1000,
      };
      service.setModelParameters(parameters);
    });

    it("should set response format", () => {
      const format = {
        type: "json_schema" as const,
        json_schema: {
          name: "test",
          strict: true,
          schema: { type: "object" },
        },
      };
      service.setResponseFormat(format);
    });
  });

  describe("Conversation management", () => {
    it("should add messages to conversation", () => {
      service.addToConversation("User message", "user");
      service.addToConversation("Assistant response", "assistant");

      const history = service.getConversationHistory();
      expect(history).toHaveLength(2);
      expect(history[0].role).toBe("user");
      expect(history[1].role).toBe("assistant");
    });

    it("should clear conversation", () => {
      service.addToConversation("Test message", "user");
      service.clearConversation();

      const history = service.getConversationHistory();
      expect(history).toHaveLength(0);
    });
  });

  describe("Cache management", () => {
    it("should enable cache", () => {
      service.enableCache(1800); // 30 minutes
    });

    it("should disable cache", () => {
      service.disableCache();
    });

    it("should clear cache", () => {
      service.clearCache();
    });
  });

  describe("Error handling", () => {
    it("should handle invalid JSON response", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve("Invalid JSON"),
      });

      await expect(
        service.sendMessage({
          userMessage: "Test message",
        })
      ).rejects.toThrow(OpenRouterError);
    });

    it("should handle missing choices in response", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(JSON.stringify({ model: "test" })),
      });

      await expect(
        service.sendMessage({
          userMessage: "Test message",
        })
      ).rejects.toThrow(OpenRouterError);
    });
  });
});
