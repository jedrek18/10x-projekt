import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";

// Ustaw zmienne środowiskowe przed importem modułów
vi.stubEnv("OPENROUTER_API_KEY", "test-api-key");

// Mock OpenRouterService przed importem
const mockOpenRouterService = {
  sendMessage: vi.fn(),
  clearCache: vi.fn(),
};

vi.mock("../src/lib/services/openrouter.service", () => ({
  OpenRouterService: vi.fn().mockImplementation(() => mockOpenRouterService),
}));

import { generateProposals, translateText, correctGrammar, explainVocabulary } from "../src/lib/services/ai.service";

// Mock Supabase
const mockSupabase = {
  auth: {
    getUser: vi.fn(),
  },
  from: vi.fn().mockReturnValue({
    insert: vi.fn().mockResolvedValue({ error: null }),
  }),
};

describe("AI Service Integration Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Mock authenticated user
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: "test-user-id" } },
      error: null,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("generateProposals", () => {
    it("should generate proposals successfully", async () => {
      const mockResponse = {
        choices: [
          {
            message: {
              content: JSON.stringify({
                flashcards: [
                  { front: "What is AI?", back: "Artificial Intelligence" },
                  { front: "What is ML?", back: "Machine Learning" },
                ],
              }),
            },
          },
        ],
        model: "openai/gpt-4o-mini",
      };

      mockOpenRouterService.sendMessage.mockResolvedValue(mockResponse);

      const command = {
        source_text:
          "Artificial Intelligence (AI) is a branch of computer science that aims to create intelligent machines that work and react like humans.",
        max_proposals: 2,
      };

      const result = await generateProposals(mockSupabase as any, command);

      expect(result.items).toHaveLength(2);
      expect(result.items[0].front).toBe("What is AI?");
      expect(result.items[0].back).toBe("Artificial Intelligence");
      expect(result.returned_count).toBe(2);
      expect(result.request_id).toBeDefined();
    });

    it("should throw error when AI service fails", async () => {
      mockOpenRouterService.sendMessage.mockRejectedValue(new Error("API Error"));

      const command = {
        source_text: "Test text for generation",
        max_proposals: 3,
      };

      await expect(generateProposals(mockSupabase as any, command)).rejects.toThrow("API Error");
    });
  });

  describe("translateText", () => {
    it("should translate text successfully", async () => {
      const mockResponse = {
        choices: [
          {
            message: {
              content: JSON.stringify({
                translation: "Hello world",
                original: "Cześć świecie",
              }),
            },
          },
        ],
        model: "openai/gpt-4o-mini",
      };

      mockOpenRouterService.sendMessage.mockResolvedValue(mockResponse);

      const result = await translateText(mockSupabase as any, "Cześć świecie", "en");

      expect(result.translation).toBe("Hello world");
      expect(result.original).toBe("Cześć świecie");
    });

    it("should handle translation errors", async () => {
      mockOpenRouterService.sendMessage.mockRejectedValue(new Error("Translation failed"));

      await expect(translateText(mockSupabase as any, "Test", "en")).rejects.toThrow("Translation failed");
    });
  });

  describe("correctGrammar", () => {
    it("should correct grammar successfully", async () => {
      const mockResponse = {
        choices: [
          {
            message: {
              content: JSON.stringify({
                corrected: "This is correct grammar.",
                original: "This is incorrect grammar",
                explanation: "Fixed subject-verb agreement",
              }),
            },
          },
        ],
        model: "openai/gpt-4o-mini",
      };

      mockOpenRouterService.sendMessage.mockResolvedValue(mockResponse);

      const result = await correctGrammar(mockSupabase as any, "This is incorrect grammar");

      expect(result.corrected).toBe("This is correct grammar.");
      expect(result.original).toBe("This is incorrect grammar");
      expect(result.explanation).toBe("Fixed subject-verb agreement");
    });

    it("should handle grammar correction errors", async () => {
      mockOpenRouterService.sendMessage.mockRejectedValue(new Error("Grammar correction failed"));

      await expect(correctGrammar(mockSupabase as any, "Test text")).rejects.toThrow("Grammar correction failed");
    });
  });

  describe("explainVocabulary", () => {
    it("should explain vocabulary successfully", async () => {
      const mockResponse = {
        choices: [
          {
            message: {
              content: JSON.stringify({
                word: "serendipity",
                definition: "The occurrence and development of events by chance in a happy or beneficial way",
                examples: ["Finding this book was pure serendipity"],
                etymology: "From Persian fairy tale",
              }),
            },
          },
        ],
        model: "openai/gpt-4o-mini",
      };

      mockOpenRouterService.sendMessage.mockResolvedValue(mockResponse);

      const result = await explainVocabulary(mockSupabase as any, "serendipity");

      expect(result.word).toBe("serendipity");
      expect(result.definition).toBe("The occurrence and development of events by chance in a happy or beneficial way");
      expect(result.examples).toEqual(["Finding this book was pure serendipity"]);
      expect(result.etymology).toBe("From Persian fairy tale");
    });

    it("should handle vocabulary explanation errors", async () => {
      mockOpenRouterService.sendMessage.mockRejectedValue(new Error("Vocabulary explanation failed"));

      await expect(explainVocabulary(mockSupabase as any, "test")).rejects.toThrow("Vocabulary explanation failed");
    });
  });

  describe("Authentication", () => {
    it("should throw UnauthorizedError when user is not authenticated", async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      });

      const command = {
        source_text: "Test text",
        max_proposals: 1,
      };

      await expect(generateProposals(mockSupabase as any, command)).rejects.toThrow("Unauthorized");
    });

    it("should use provided userId when available", async () => {
      const mockResponse = {
        choices: [
          {
            message: {
              content: JSON.stringify({
                translation: "Hello world",
                original: "Cześć świecie",
              }),
            },
          },
        ],
        model: "openai/gpt-4o-mini",
      };

      mockOpenRouterService.sendMessage.mockResolvedValue(mockResponse);

      const result = await translateText(mockSupabase as any, "Cześć świecie", "en", "custom-user-id");

      expect(result.translation).toBe("Hello world");
    });
  });

  describe("Error handling", () => {
    it("should handle JSON parsing errors", async () => {
      const mockResponse = {
        choices: [
          {
            message: {
              content: "Invalid JSON response",
            },
          },
        ],
        model: "openai/gpt-4o-mini",
      };

      mockOpenRouterService.sendMessage.mockResolvedValue(mockResponse);

      await expect(translateText(mockSupabase as any, "Test", "en")).rejects.toThrow("Unexpected token");
    });

    it("should handle empty response content", async () => {
      const mockResponse = {
        choices: [
          {
            message: {
              content: "",
            },
          },
        ],
        model: "openai/gpt-4o-mini",
      };

      mockOpenRouterService.sendMessage.mockResolvedValue(mockResponse);

      await expect(translateText(mockSupabase as any, "Test", "en")).rejects.toThrow(
        "No translation response received"
      );
    });
  });
});
