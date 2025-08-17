import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { generateProposals, translateText, correctGrammar, explainVocabulary } from '../src/lib/services/ai.service';

// Mock the OpenRouter service
vi.mock('../src/lib/services/openrouter.service', () => ({
  OpenRouterService: vi.fn().mockImplementation(() => ({
    sendMessage: vi.fn()
  }))
}));

// Mock Supabase
const mockSupabase = {
  auth: {
    getUser: vi.fn()
  },
  from: vi.fn().mockReturnValue({
    insert: vi.fn().mockResolvedValue({ error: null })
  })
};

describe('AI Service Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock authenticated user
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'test-user-id' } },
      error: null
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('generateProposals', () => {
    it('should generate proposals successfully', async () => {
      const mockResponse = {
        choices: [{
          message: {
            content: JSON.stringify({
              flashcards: [
                { front: 'What is AI?', back: 'Artificial Intelligence' },
                { front: 'What is ML?', back: 'Machine Learning' }
              ]
            })
          }
        }],
        model: 'openai/gpt-4o-mini'
      };

      // Mock the OpenRouter service
      const { OpenRouterService } = await import('../src/lib/services/openrouter.service');
      const mockService = {
        sendMessage: vi.fn().mockResolvedValue(mockResponse)
      };
      (OpenRouterService as any).mockImplementation(() => mockService);

      const command = {
        source_text: 'Artificial Intelligence (AI) is a branch of computer science that aims to create intelligent machines that work and react like humans.',
        max_proposals: 2
      };

      const result = await generateProposals(mockSupabase as any, command);

      expect(result.items).toHaveLength(2);
      expect(result.items[0].front).toBe('What is AI?');
      expect(result.items[0].back).toBe('Artificial Intelligence');
      expect(result.returned_count).toBe(2);
      expect(result.request_id).toBeDefined();
    });

    it('should fallback to deterministic generation on error', async () => {
      // Mock the OpenRouter service to throw error
      const { OpenRouterService } = await import('../src/lib/services/openrouter.service');
      const mockService = {
        sendMessage: vi.fn().mockRejectedValue(new Error('API Error'))
      };
      (OpenRouterService as any).mockImplementation(() => mockService);

      const command = {
        source_text: 'Test text for generation',
        max_proposals: 3
      };

      const result = await generateProposals(mockSupabase as any, command);

      expect(result.items).toHaveLength(3);
      expect(result.returned_count).toBe(3);
      expect(result.request_id).toBeDefined();
    });
  });

  describe('translateText', () => {
    it('should translate text successfully', async () => {
      const mockResponse = {
        choices: [{
          message: {
            content: JSON.stringify({
              translation: 'Hello world',
              confidence: 0.95,
              language: 'en'
            })
          }
        }]
      };

      // Mock the OpenRouter service
      const { OpenRouterService } = await import('../src/lib/services/openrouter.service');
      const mockService = {
        sendMessage: vi.fn().mockResolvedValue(mockResponse)
      };
      (OpenRouterService as any).mockImplementation(() => mockService);

      const result = await translateText(mockSupabase as any, 'Cześć świecie', 'en');

      expect(result.translation).toBe('Hello world');
      expect(result.confidence).toBe(0.95);
      expect(result.language).toBe('en');
    });

    it('should handle translation errors', async () => {
      // Mock the OpenRouter service to throw error
      const { OpenRouterService } = await import('../src/lib/services/openrouter.service');
      const mockService = {
        sendMessage: vi.fn().mockRejectedValue(new Error('Translation failed'))
      };
      (OpenRouterService as any).mockImplementation(() => mockService);

      await expect(translateText(mockSupabase as any, 'Test', 'en'))
        .rejects.toThrow('Translation failed');
    });
  });

  describe('correctGrammar', () => {
    it('should correct grammar successfully', async () => {
      const mockResponse = {
        choices: [{
          message: {
            content: JSON.stringify({
              original: 'I goes to school',
              corrected: 'I go to school',
              corrections: [
                {
                  original: 'goes',
                  corrected: 'go',
                  explanation: 'First person singular should use "go" not "goes"',
                  type: 'grammar'
                }
              ],
              confidence: 0.9
            })
          }
        }]
      };

      // Mock the OpenRouter service
      const { OpenRouterService } = await import('../src/lib/services/openrouter.service');
      const mockService = {
        sendMessage: vi.fn().mockResolvedValue(mockResponse)
      };
      (OpenRouterService as any).mockImplementation(() => mockService);

      const result = await correctGrammar(mockSupabase as any, 'I goes to school');

      expect(result.original).toBe('I goes to school');
      expect(result.corrected).toBe('I go to school');
      expect(result.corrections).toHaveLength(1);
      expect(result.confidence).toBe(0.9);
    });

    it('should handle grammar correction errors', async () => {
      // Mock the OpenRouter service to throw error
      const { OpenRouterService } = await import('../src/lib/services/openrouter.service');
      const mockService = {
        sendMessage: vi.fn().mockRejectedValue(new Error('Grammar correction failed'))
      };
      (OpenRouterService as any).mockImplementation(() => mockService);

      await expect(correctGrammar(mockSupabase as any, 'Test text'))
        .rejects.toThrow('Grammar correction failed');
    });
  });

  describe('explainVocabulary', () => {
    it('should explain vocabulary successfully', async () => {
      const mockResponse = {
        choices: [{
          message: {
            content: JSON.stringify({
              word: 'serendipity',
              definition: 'The occurrence and development of events by chance in a happy or beneficial way',
              examples: [
                'Finding that book was pure serendipity.',
                'It was serendipity that led to their meeting.'
              ],
              synonyms: ['chance', 'fortune', 'luck'],
              antonyms: ['misfortune', 'bad luck'],
              partOfSpeech: 'noun',
              difficulty: 'advanced'
            })
          }
        }]
      };

      // Mock the OpenRouter service
      const { OpenRouterService } = await import('../src/lib/services/openrouter.service');
      const mockService = {
        sendMessage: vi.fn().mockResolvedValue(mockResponse)
      };
      (OpenRouterService as any).mockImplementation(() => mockService);

      const result = await explainVocabulary(mockSupabase as any, 'serendipity', 'Finding that book was pure serendipity');

      expect(result.word).toBe('serendipity');
      expect(result.definition).toContain('occurrence and development of events');
      expect(result.examples).toHaveLength(2);
      expect(result.synonyms).toContain('chance');
      expect(result.partOfSpeech).toBe('noun');
      expect(result.difficulty).toBe('advanced');
    });

    it('should handle vocabulary explanation errors', async () => {
      // Mock the OpenRouter service to throw error
      const { OpenRouterService } = await import('../src/lib/services/openrouter.service');
      const mockService = {
        sendMessage: vi.fn().mockRejectedValue(new Error('Vocabulary explanation failed'))
      };
      (OpenRouterService as any).mockImplementation(() => mockService);

      await expect(explainVocabulary(mockSupabase as any, 'test'))
        .rejects.toThrow('Vocabulary explanation failed');
    });
  });

  describe('Authentication', () => {
    it('should throw UnauthorizedError when user is not authenticated', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Not authenticated' }
      });

      const command = {
        source_text: 'Test text',
        max_proposals: 2
      };

      await expect(generateProposals(mockSupabase as any, command))
        .rejects.toThrow('Unauthorized');
    });

    it('should use provided userId when available', async () => {
      const mockResponse = {
        choices: [{
          message: {
            content: JSON.stringify({
              translation: 'Test translation',
              language: 'en'
            })
          }
        }]
      };

      // Mock the OpenRouter service
      const { OpenRouterService } = await import('../src/lib/services/openrouter.service');
      const mockService = {
        sendMessage: vi.fn().mockResolvedValue(mockResponse)
      };
      (OpenRouterService as any).mockImplementation(() => mockService);

      const result = await translateText(mockSupabase as any, 'Test', 'en', 'provided-user-id');

      expect(result.translation).toBe('Test translation');
      // Should not call getUser when userId is provided
      expect(mockSupabase.auth.getUser).not.toHaveBeenCalled();
    });
  });

  describe('Error handling', () => {
    it('should handle JSON parsing errors', async () => {
      const mockResponse = {
        choices: [{
          message: {
            content: 'Invalid JSON response'
          }
        }]
      };

      // Mock the OpenRouter service
      const { OpenRouterService } = await import('../src/lib/services/openrouter.service');
      const mockService = {
        sendMessage: vi.fn().mockResolvedValue(mockResponse)
      };
      (OpenRouterService as any).mockImplementation(() => mockService);

      await expect(translateText(mockSupabase as any, 'Test', 'en'))
        .rejects.toThrow('Failed to parse AI response');
    });

    it('should handle empty response content', async () => {
      const mockResponse = {
        choices: [{
          message: {
            content: null
          }
        }]
      };

      // Mock the OpenRouter service
      const { OpenRouterService } = await import('../src/lib/services/openrouter.service');
      const mockService = {
        sendMessage: vi.fn().mockResolvedValue(mockResponse)
      };
      (OpenRouterService as any).mockImplementation(() => mockService);

      await expect(translateText(mockSupabase as any, 'Test', 'en'))
        .rejects.toThrow('No translation response received');
    });
  });
});
