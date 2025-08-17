import type { ResponseFormat } from '../services/openrouter.service';

// ============================================================================
// TRANSLATION SCHEMAS
// ============================================================================

export const TRANSLATION_SCHEMA: ResponseFormat = {
  type: 'json_schema',
  json_schema: {
    name: 'translation',
    strict: true,
    schema: {
      type: 'object',
      properties: {
        translation: { 
          type: 'string',
          description: 'The translated text'
        },
        confidence: { 
          type: 'number', 
          minimum: 0, 
          maximum: 1,
          description: 'Confidence level of the translation (0-1)'
        },
        language: { 
          type: 'string',
          description: 'Detected or target language code (e.g., "en", "pl", "de")'
        },
        originalText: {
          type: 'string',
          description: 'The original text that was translated'
        }
      },
      required: ['translation', 'language']
    }
  }
};

export const MULTI_LANGUAGE_TRANSLATION_SCHEMA: ResponseFormat = {
  type: 'json_schema',
  json_schema: {
    name: 'multi_language_translation',
    strict: true,
    schema: {
      type: 'object',
      properties: {
        translations: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              language: { type: 'string' },
              translation: { type: 'string' },
              confidence: { type: 'number', minimum: 0, maximum: 1 }
            },
            required: ['language', 'translation']
          }
        }
      },
      required: ['translations']
    }
  }
};

// ============================================================================
// FLASHCARD SCHEMAS
// ============================================================================

export const FLASHCARD_SCHEMA: ResponseFormat = {
  type: 'json_schema',
  json_schema: {
    name: 'flashcard',
    strict: true,
    schema: {
      type: 'object',
      properties: {
        front: { 
          type: 'string',
          description: 'The question or prompt side of the flashcard'
        },
        back: { 
          type: 'string',
          description: 'The answer side of the flashcard'
        },
        difficulty: { 
          type: 'string', 
          enum: ['easy', 'medium', 'hard'],
          description: 'Estimated difficulty level'
        },
        tags: { 
          type: 'array', 
          items: { type: 'string' },
          description: 'Tags for categorizing the flashcard'
        },
        context: {
          type: 'string',
          description: 'Additional context or explanation'
        }
      },
      required: ['front', 'back']
    }
  }
};

export const FLASHCARD_SET_SCHEMA: ResponseFormat = {
  type: 'json_schema',
  json_schema: {
    name: 'flashcard_set',
    strict: true,
    schema: {
      type: 'object',
      properties: {
        flashcards: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              front: { type: 'string' },
              back: { type: 'string' },
              difficulty: { type: 'string', enum: ['easy', 'medium', 'hard'] },
              tags: { type: 'array', items: { type: 'string' } },
              context: { type: 'string' }
            },
            required: ['front', 'back']
          }
        },
        metadata: {
          type: 'object',
          properties: {
            title: { type: 'string' },
            description: { type: 'string' },
            language: { type: 'string' },
            difficulty: { type: 'string', enum: ['beginner', 'intermediate', 'advanced'] }
          }
        }
      },
      required: ['flashcards']
    }
  }
};

// ============================================================================
// GRAMMAR AND LANGUAGE LEARNING SCHEMAS
// ============================================================================

export const GRAMMAR_CORRECTION_SCHEMA: ResponseFormat = {
  type: 'json_schema',
  json_schema: {
    name: 'grammar_correction',
    strict: true,
    schema: {
      type: 'object',
      properties: {
        original: { 
          type: 'string',
          description: 'The original text'
        },
        corrected: { 
          type: 'string',
          description: 'The corrected text'
        },
        corrections: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              original: { type: 'string' },
              corrected: { type: 'string' },
              explanation: { type: 'string' },
              type: { type: 'string', enum: ['grammar', 'spelling', 'punctuation', 'style'] }
            },
            required: ['original', 'corrected', 'explanation']
          }
        },
        confidence: { type: 'number', minimum: 0, maximum: 1 }
      },
      required: ['original', 'corrected', 'corrections']
    }
  }
};

export const VOCABULARY_EXPLANATION_SCHEMA: ResponseFormat = {
  type: 'json_schema',
  json_schema: {
    name: 'vocabulary_explanation',
    strict: true,
    schema: {
      type: 'object',
      properties: {
        word: { 
          type: 'string',
          description: 'The word or phrase being explained'
        },
        definition: { 
          type: 'string',
          description: 'Clear definition of the word'
        },
        examples: {
          type: 'array',
          items: { type: 'string' },
          description: 'Example sentences using the word'
        },
        synonyms: {
          type: 'array',
          items: { type: 'string' },
          description: 'Synonyms or similar words'
        },
        antonyms: {
          type: 'array',
          items: { type: 'string' },
          description: 'Antonyms or opposite words'
        },
        partOfSpeech: {
          type: 'string',
          enum: ['noun', 'verb', 'adjective', 'adverb', 'pronoun', 'preposition', 'conjunction', 'interjection']
        },
        difficulty: {
          type: 'string',
          enum: ['beginner', 'intermediate', 'advanced']
        }
      },
      required: ['word', 'definition']
    }
  }
};

// ============================================================================
// STUDY AND PROGRESS SCHEMAS
// ============================================================================

export const STUDY_RECOMMENDATION_SCHEMA: ResponseFormat = {
  type: 'json_schema',
  json_schema: {
    name: 'study_recommendation',
    strict: true,
    schema: {
      type: 'object',
      properties: {
        recommendations: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              type: { 
                type: 'string', 
                enum: ['vocabulary', 'grammar', 'pronunciation', 'listening', 'reading', 'writing']
              },
              priority: { type: 'number', minimum: 1, maximum: 5 },
              description: { type: 'string' },
              resources: {
                type: 'array',
                items: { type: 'string' }
              },
              estimatedTime: { type: 'number', description: 'Estimated time in minutes' }
            },
            required: ['type', 'priority', 'description']
          }
        },
        overallProgress: {
          type: 'object',
          properties: {
            level: { type: 'string', enum: ['beginner', 'intermediate', 'advanced'] },
            percentage: { type: 'number', minimum: 0, maximum: 100 },
            nextMilestone: { type: 'string' }
          }
        }
      },
      required: ['recommendations']
    }
  }
};

// ============================================================================
// UTILITY SCHEMAS
// ============================================================================

export const TEXT_ANALYSIS_SCHEMA: ResponseFormat = {
  type: 'json_schema',
  json_schema: {
    name: 'text_analysis',
    strict: true,
    schema: {
      type: 'object',
      properties: {
        language: { type: 'string' },
        complexity: {
          type: 'object',
          properties: {
            level: { type: 'string', enum: ['beginner', 'intermediate', 'advanced'] },
            score: { type: 'number', minimum: 0, maximum: 100 }
          }
        },
        keyWords: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              word: { type: 'string' },
              frequency: { type: 'number' },
              importance: { type: 'number', minimum: 0, maximum: 1 }
            },
            required: ['word', 'frequency']
          }
        },
        topics: {
          type: 'array',
          items: { type: 'string' }
        },
        readingTime: { type: 'number', description: 'Estimated reading time in minutes' }
      },
      required: ['language']
    }
  }
};

export const ERROR_RESPONSE_SCHEMA: ResponseFormat = {
  type: 'json_schema',
  json_schema: {
    name: 'error_response',
    strict: true,
    schema: {
      type: 'object',
      properties: {
        error: { type: 'string' },
        code: { type: 'string' },
        details: { type: 'string' },
        suggestions: {
          type: 'array',
          items: { type: 'string' }
        }
      },
      required: ['error']
    }
  }
};

// ============================================================================
// SCHEMA UTILITIES
// ============================================================================

export const SCHEMAS = {
  translation: TRANSLATION_SCHEMA,
  multiLanguageTranslation: MULTI_LANGUAGE_TRANSLATION_SCHEMA,
  flashcard: FLASHCARD_SCHEMA,
  flashcardSet: FLASHCARD_SET_SCHEMA,
  grammarCorrection: GRAMMAR_CORRECTION_SCHEMA,
  vocabularyExplanation: VOCABULARY_EXPLANATION_SCHEMA,
  studyRecommendation: STUDY_RECOMMENDATION_SCHEMA,
  textAnalysis: TEXT_ANALYSIS_SCHEMA,
  errorResponse: ERROR_RESPONSE_SCHEMA
} as const;

export type SchemaType = keyof typeof SCHEMAS;

export function getSchema(type: SchemaType): ResponseFormat {
  return SCHEMAS[type];
}

export function validateSchemaType(type: string): type is SchemaType {
  return type in SCHEMAS;
}
