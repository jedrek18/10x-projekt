# AI API Documentation

## Overview

The AI API provides access to various language learning and text processing capabilities powered by OpenRouter's language models. All endpoints require authentication and are subject to rate limiting.

## Base URL

```
https://10x-projekt.vercel.app/api/ai
```

## Authentication

All endpoints require a valid authentication token. Include the token in the request headers:

```
Authorization: Bearer <your-token>
```

## Rate Limiting

- **Default limit**: 10 requests per minute per user
- **Response headers**: 
  - `X-RateLimit-Remaining`: Number of requests remaining
  - `X-RateLimit-Reset`: Time when the limit resets (Unix timestamp)

## Error Responses

All endpoints return errors in the following format:

```json
{
  "error": "Error message",
  "code": "error_code",
  "details": "Additional error details"
}
```

Common error codes:
- `401`: Unauthorized
- `429`: Rate limit exceeded
- `400`: Bad request
- `500`: Internal server error

---

## Endpoints

### 1. Generate Flashcards

**POST** `/api/ai/generate`

Generates flashcards from provided text using AI.

#### Request Body

```json
{
  "source_text": "Text to generate flashcards from (1000-10000 characters)",
  "max_proposals": 15
}
```

#### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `source_text` | string | Yes | Source text for flashcard generation (1000-10000 characters) |
| `max_proposals` | number | Yes | Number of flashcards to generate (10-50) |

#### Response

```json
{
  "items": [
    {
      "front": "Question or prompt",
      "back": "Answer or explanation"
    }
  ],
  "returned_count": 15,
  "request_id": "uuid-v4"
}
```

#### Example

```bash
curl -X POST https://10x-projekt.vercel.app/api/ai/generate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "source_text": "Artificial Intelligence (AI) is a branch of computer science that aims to create intelligent machines that work and react like humans.",
    "max_proposals": 5
  }'
```

---

### 2. Translate Text

**POST** `/api/ai/translate`

Translates text between languages.

#### Request Body

```json
{
  "text": "Text to translate (1-5000 characters)",
  "targetLanguage": "en",
  "sourceLanguage": "pl"
}
```

#### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `text` | string | Yes | Text to translate (1-5000 characters) |
| `targetLanguage` | string | Yes | Target language code (e.g., "en", "pl", "de") |
| `sourceLanguage` | string | No | Source language code (auto-detected if not provided) |

#### Response

```json
{
  "translation": "Translated text",
  "confidence": 0.95,
  "language": "en",
  "originalText": "Original text"
}
```

#### Example

```bash
curl -X POST https://10x-projekt.vercel.app/api/ai/translate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "text": "Cześć świecie",
    "targetLanguage": "en"
  }'
```

---

### 3. Grammar Correction

**POST** `/api/ai/grammar`

Corrects grammatical errors in text.

#### Request Body

```json
{
  "text": "Text to correct (1-2000 characters)",
  "language": "en",
  "includeExplanations": true
}
```

#### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `text` | string | Yes | Text to correct (1-2000 characters) |
| `language` | string | No | Language code for correction |
| `includeExplanations` | boolean | No | Include explanations for corrections (default: true) |

#### Response

```json
{
  "original": "Original text with errors",
  "corrected": "Corrected text",
  "corrections": [
    {
      "original": "incorrect word",
      "corrected": "correct word",
      "explanation": "Explanation of the correction",
      "type": "grammar"
    }
  ],
  "confidence": 0.9
}
```

#### Example

```bash
curl -X POST https://10x-projekt.vercel.app/api/ai/grammar \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "text": "I goes to school",
    "language": "en"
  }'
```

---

### 4. Vocabulary Explanation

**POST** `/api/ai/vocabulary`

Provides detailed explanations of words or phrases.

#### Request Body

```json
{
  "word": "serendipity",
  "context": "Finding that book was pure serendipity",
  "language": "en",
  "includeExamples": true,
  "includeSynonyms": true
}
```

#### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `word` | string | Yes | Word or phrase to explain (1-100 characters) |
| `context` | string | No | Context sentence (max 500 characters) |
| `language` | string | No | Language code |
| `includeExamples` | boolean | No | Include usage examples (default: true) |
| `includeSynonyms` | boolean | No | Include synonyms and antonyms (default: true) |

#### Response

```json
{
  "word": "serendipity",
  "definition": "The occurrence and development of events by chance in a happy or beneficial way",
  "examples": [
    "Finding that book was pure serendipity.",
    "It was serendipity that led to their meeting."
  ],
  "synonyms": ["chance", "fortune", "luck"],
  "antonyms": ["misfortune", "bad luck"],
  "partOfSpeech": "noun",
  "difficulty": "advanced"
}
```

#### Example

```bash
curl -X POST https://10x-projekt.vercel.app/api/ai/vocabulary \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "word": "serendipity",
    "context": "Finding that book was pure serendipity"
  }'
```

---

## Streaming Support

The `/api/ai/generate` endpoint supports Server-Sent Events (SSE) for real-time flashcard generation.

### SSE Request

```bash
curl -X POST https://10x-projekt.vercel.app/api/ai/generate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -H "Accept: text/event-stream" \
  -d '{
    "source_text": "Your text here",
    "max_proposals": 10
  }'
```

### SSE Response Format

```
:ok

: ping

data: {"type":"proposal","data":{"front":"Question","back":"Answer"}}

data: {"type":"progress","data":{"count":1}}

data: {"type":"done","data":{"returned_count":10,"request_id":"uuid"}}
```

Event types:
- `proposal`: Individual flashcard
- `progress`: Generation progress update
- `done`: Generation completed
- `error`: Error occurred

---

## Language Codes

Supported language codes follow ISO 639-1 or ISO 639-2 format:

| Code | Language |
|------|----------|
| `en` | English |
| `pl` | Polish |
| `de` | German |
| `fr` | French |
| `es` | Spanish |
| `it` | Italian |
| `pt` | Portuguese |
| `ru` | Russian |
| `ja` | Japanese |
| `ko` | Korean |
| `zh` | Chinese |
| `ar` | Arabic |

---

## Models

The API uses various language models through OpenRouter:

| Model | Provider | Max Tokens | Cost |
|-------|----------|------------|------|
| GPT-OSS-20B (Free) | OpenAI | 8,192 | Free |
| GPT-4o Mini | OpenAI | 16,384 | $0.00015/1K |
| GPT-4o | OpenAI | 128,000 | $0.005/1K |
| Claude 3 Haiku | Anthropic | 200,000 | $0.00025/1K |
| Claude 3 Sonnet | Anthropic | 200,000 | $0.003/1K |
| Gemini Flash 1.5 | Google | 1,048,576 | $0.000075/1K |
| Llama 3.1 8B | Meta | 8,192 | $0.00005/1K |

---

## Best Practices

### 1. Error Handling

Always handle potential errors in your client code:

```javascript
try {
  const response = await fetch('/api/ai/translate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      text: 'Hello world',
      targetLanguage: 'pl'
    })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error);
  }

  const result = await response.json();
  console.log(result.translation);
} catch (error) {
  console.error('Translation failed:', error.message);
}
```

### 2. Rate Limiting

Implement exponential backoff when hitting rate limits:

```javascript
async function makeRequestWithRetry(requestFn, maxRetries = 3) {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await requestFn();
    } catch (error) {
      if (error.message.includes('Rate limit') && attempt < maxRetries - 1) {
        const delay = Math.pow(2, attempt) * 1000; // Exponential backoff
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      throw error;
    }
  }
}
```

### 3. Input Validation

Validate inputs before sending requests:

```javascript
function validateTranslationRequest(text, targetLanguage) {
  if (!text || text.length > 5000) {
    throw new Error('Text must be between 1 and 5000 characters');
  }
  
  if (!targetLanguage || !/^[a-z]{2,3}(-[A-Z]{2})?$/.test(targetLanguage)) {
    throw new Error('Invalid language code');
  }
}
```

### 4. Caching

Cache responses when appropriate to reduce API calls:

```javascript
const cache = new Map();

async function getCachedTranslation(text, targetLanguage) {
  const key = `${text}:${targetLanguage}`;
  
  if (cache.has(key)) {
    const cached = cache.get(key);
    if (Date.now() - cached.timestamp < 3600000) { // 1 hour
      return cached.data;
    }
  }
  
  const result = await translateText(text, targetLanguage);
  cache.set(key, {
    data: result,
    timestamp: Date.now()
  });
  
  return result;
}
```

---

## SDK Examples

### JavaScript/TypeScript

```typescript
class AIAPI {
  private baseUrl: string;
  private token: string;

  constructor(token: string, baseUrl = 'https://10x-projekt.vercel.app/api/ai') {
    this.token = token;
    this.baseUrl = baseUrl;
  }

  private async request(endpoint: string, data: any) {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.token}`
      },
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error);
    }

    return response.json();
  }

  async generateFlashcards(text: string, count: number = 10) {
    return this.request('/generate', {
      source_text: text,
      max_proposals: count
    });
  }

  async translateText(text: string, targetLanguage: string, sourceLanguage?: string) {
    return this.request('/translate', {
      text,
      targetLanguage,
      sourceLanguage
    });
  }

  async correctGrammar(text: string, language?: string) {
    return this.request('/grammar', {
      text,
      language
    });
  }

  async explainVocabulary(word: string, context?: string) {
    return this.request('/vocabulary', {
      word,
      context
    });
  }
}

// Usage
const api = new AIAPI('your-token-here');

// Generate flashcards
const flashcards = await api.generateFlashcards('Your text here', 5);

// Translate text
const translation = await api.translateText('Hello world', 'pl');

// Correct grammar
const corrected = await api.correctGrammar('I goes to school');

// Explain vocabulary
const explanation = await api.explainVocabulary('serendipity');
```

---

## Support

For API support and questions:

- **Documentation**: This document
- **Issues**: GitHub repository issues
- **Email**: support@10x-projekt.com

---

## Changelog

### v1.0.0 (Current)
- Initial release
- Flashcard generation
- Text translation
- Grammar correction
- Vocabulary explanation
- Streaming support for flashcard generation
- Rate limiting and authentication
- Comprehensive error handling
