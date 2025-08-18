# Przewodnik implementacji usługi OpenRouter

## 1. Opis usługi

Usługa OpenRouter to klasa TypeScript odpowiedzialna za komunikację z interfejsem API OpenRouter w celu generowania odpowiedzi opartych na modelach językowych (LLM). Usługa zapewnia:

- Bezpieczną komunikację z OpenRouter API
- Obsługę różnych modeli LLM (OpenAI, Anthropic, Google, etc.)
- Walidację i parsowanie odpowiedzi JSON
- Zarządzanie kontekstem konwersacji
- Obsługę błędów i retry logic
- Cache'owanie odpowiedzi
- Monitoring i logging

## 2. Opis konstruktora

```typescript
interface OpenRouterConfig {
  apiKey: string;
  baseUrl?: string;
  defaultModel?: string;
  systemMessage?: string;
  timeout?: number;
  maxRetries?: number;
  enableCache?: boolean;
  cacheTtl?: number;
}

class OpenRouterService {
  constructor(config: OpenRouterConfig) {
    // Inicjalizacja z walidacją klucza API
    // Konfiguracja domyślnych parametrów
    // Ustawienie system message
    // Inicjalizacja cache'u
  }
}
```

### Parametry konstruktora:

- **apiKey**: Klucz API OpenRouter (wymagany)
- **baseUrl**: Bazowy URL API (domyślnie: "https://openrouter.ai/api/v1")
- **defaultModel**: Domyślny model LLM (np. "openai/gpt-4o-mini")
- **systemMessage**: Komunikat systemowy definiujący rolę asystenta
- **timeout**: Timeout żądań w milisekundach (domyślnie: 30000)
- **maxRetries**: Maksymalna liczba prób ponowienia (domyślnie: 3)
- **enableCache**: Włączenie cache'owania odpowiedzi (domyślnie: true)
- **cacheTtl**: Czas życia cache'u w sekundach (domyślnie: 3600)

## 3. Publiczne metody i pola

### 3.1 Główne metody komunikacji

```typescript
interface MessageRequest {
  userMessage: string;
  systemMessage?: string;
  model?: string;
  responseFormat?: ResponseFormat;
  parameters?: ModelParameters;
  conversationId?: string;
}

interface ResponseFormat {
  type: 'json_schema';
  json_schema: {
    name: string;
    strict: boolean;
    schema: object;
  };
}

interface ModelParameters {
  temperature?: number;
  max_tokens?: number;
  top_p?: number;
  frequency_penalty?: number;
  presence_penalty?: number;
}

async sendMessage(request: MessageRequest): Promise<OpenRouterResponse>
```

### 3.2 Metody konfiguracyjne

```typescript
setSystemMessage(message: string): void
setDefaultModel(model: string): void
setModelParameters(parameters: ModelParameters): void
setResponseFormat(format: ResponseFormat): void
```

### 3.3 Metody zarządzania kontekstem

```typescript
addToConversation(message: string, role: 'user' | 'assistant'): void
clearConversation(): void
getConversationHistory(): ConversationMessage[]
```

### 3.4 Metody cache'owania

```typescript
enableCache(ttl?: number): void
disableCache(): void
clearCache(): void
```

## 4. Prywatne metody i pola

### 4.1 Pola prywatne

```typescript
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
```

### 4.2 Prywatne metody pomocnicze

```typescript
private validateApiKey(apiKey: string): boolean
private buildRequestHeaders(): Record<string, string>
private buildRequestBody(request: MessageRequest): object
private handleApiResponse(response: Response): Promise<OpenRouterResponse>
private parseJsonResponse(response: string, schema?: object): any
private generateCacheKey(request: MessageRequest): string
private isCacheValid(cached: CachedResponse): boolean
private retryWithBackoff<T>(fn: () => Promise<T>): Promise<T>
private logError(error: Error, context: string): void
```

## 5. Obsługa błędów

### 5.1 Typy błędów

```typescript
class OpenRouterError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode?: number,
    public retryable: boolean = false
  ) {
    super(message);
    this.name = "OpenRouterError";
  }
}

class ValidationError extends OpenRouterError {
  constructor(message: string) {
    super(message, "VALIDATION_ERROR", 400, false);
  }
}

class AuthenticationError extends OpenRouterError {
  constructor(message: string) {
    super(message, "AUTHENTICATION_ERROR", 401, false);
  }
}

class RateLimitError extends OpenRouterError {
  constructor(message: string, retryAfter?: number) {
    super(message, "RATE_LIMIT_ERROR", 429, true);
    this.retryAfter = retryAfter;
  }
}

class ModelUnavailableError extends OpenRouterError {
  constructor(model: string) {
    super(`Model ${model} is not available`, "MODEL_UNAVAILABLE", 400, false);
  }
}
```

### 5.2 Scenariusze błędów i obsługa

1. **Błędy sieciowe**
   - Timeout żądań
   - Brak połączenia internetowego
   - DNS resolution errors
   - Rozwiązanie: Retry z exponential backoff

2. **Błędy API OpenRouter**
   - Nieprawidłowy klucz API
   - Rate limiting
   - Model niedostępny
   - Rozwiązanie: Obsługa kodów błędów i fallback

3. **Błędy parsowania**
   - Nieprawidłowy JSON w odpowiedzi
   - Niezgodność ze schematem
   - Rozwiązanie: Walidacja i fallback

4. **Błędy walidacji**
   - Nieprawidłowe parametry modelu
   - Nieprawidłowy format response_format
   - Rozwiązanie: Walidacja przed wysłaniem

## 6. Kwestie bezpieczeństwa

### 6.1 Bezpieczne przechowywanie klucza API

```typescript
// Użycie zmiennych środowiskowych w Supabase
const apiKey = process.env.OPENROUTER_API_KEY;
if (!apiKey) {
  throw new Error("OPENROUTER_API_KEY environment variable is required");
}
```

### 6.2 Walidacja danych wejściowych

```typescript
private validateUserInput(input: string): boolean {
  // Sprawdzenie długości
  if (input.length > 10000) {
    throw new ValidationError('User message too long');
  }

  // Sprawdzenie zawartości
  if (input.includes('__proto__') || input.includes('constructor')) {
    throw new ValidationError('Invalid input content');
  }

  return true;
}
```

### 6.3 Rate limiting

```typescript
private rateLimiter = new Map<string, { count: number; resetTime: number }>();

private checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const userLimit = this.rateLimiter.get(userId);

  if (!userLimit || now > userLimit.resetTime) {
    this.rateLimiter.set(userId, { count: 1, resetTime: now + 60000 });
    return true;
  }

  if (userLimit.count >= 10) { // 10 requests per minute
    return false;
  }

  userLimit.count++;
  return true;
}
```

## 7. Plan wdrożenia krok po kroku

### Krok 1: Konfiguracja środowiska

1. Dodaj zmienną środowiskową w Supabase:

   ```bash
   OPENROUTER_API_KEY=your_api_key_here
   ```

2. Zainstaluj zależności:
   ```bash
   npm install zod # dla walidacji schematów JSON
   ```

### Krok 2: Utwórz plik usługi

Utwórz plik `src/lib/services/openrouter.service.ts`:

```typescript
import { z } from "zod";

// Definicje typów i interfejsów
// Implementacja klasy OpenRouterService
// Obsługa błędów i walidacji
```

### Krok 3: Konfiguracja modeli

Utwórz plik `src/lib/config/models.ts`:

```typescript
export const AVAILABLE_MODELS = {
  "openai/gpt-4o-mini": {
    name: "GPT-4o Mini",
    maxTokens: 16384,
    costPer1kTokens: 0.00015,
  },
  "anthropic/claude-3-haiku": {
    name: "Claude 3 Haiku",
    maxTokens: 200000,
    costPer1kTokens: 0.00025,
  },
  // Dodaj więcej modeli według potrzeb
};
```

### Krok 4: Implementacja schematów JSON

Utwórz plik `src/lib/schemas/response-schemas.ts`:

```typescript
export const TRANSLATION_SCHEMA = {
  type: "json_schema",
  json_schema: {
    name: "translation",
    strict: true,
    schema: {
      type: "object",
      properties: {
        translation: { type: "string" },
        confidence: { type: "number", minimum: 0, maximum: 1 },
        language: { type: "string" },
      },
      required: ["translation"],
    },
  },
};

export const FLASHCARD_SCHEMA = {
  type: "json_schema",
  json_schema: {
    name: "flashcard",
    strict: true,
    schema: {
      type: "object",
      properties: {
        front: { type: "string" },
        back: { type: "string" },
        difficulty: { type: "string", enum: ["easy", "medium", "hard"] },
        tags: { type: "array", items: { type: "string" } },
      },
      required: ["front", "back"],
    },
  },
};
```

### Krok 5: Integracja z istniejącymi usługami

Zaktualizuj `src/lib/services/ai.service.ts`:

```typescript
import { OpenRouterService } from "./openrouter.service";
import { TRANSLATION_SCHEMA, FLASHCARD_SCHEMA } from "../schemas/response-schemas";

export class AiService {
  private openRouter: OpenRouterService;

  constructor() {
    this.openRouter = new OpenRouterService({
      apiKey: process.env.OPENROUTER_API_KEY!,
      defaultModel: "openai/gpt-4o-mini",
      systemMessage: "Jesteś asystentem do nauki języków obcych...",
      enableCache: true,
      cacheTtl: 3600,
    });
  }

  async generateFlashcards(text: string, count: number = 5) {
    return this.openRouter.sendMessage({
      userMessage: `Wygeneruj ${count} fiszek z tekstu: ${text}`,
      responseFormat: FLASHCARD_SCHEMA,
      parameters: {
        temperature: 0.7,
        max_tokens: 1000,
      },
    });
  }

  async translateText(text: string, targetLanguage: string) {
    return this.openRouter.sendMessage({
      userMessage: `Przetłumacz na ${targetLanguage}: ${text}`,
      responseFormat: TRANSLATION_SCHEMA,
      parameters: {
        temperature: 0.3,
        max_tokens: 500,
      },
    });
  }
}
```

### Krok 6: Aktualizacja API endpointów

Zaktualizuj `src/pages/api/ai/generate.ts`:

```typescript
import type { APIRoute } from "astro";
import { AiService } from "../../../lib/services/ai.service";
import { rateLimit } from "../../../lib/rate-limit";

export const POST: APIRoute = async ({ request }) => {
  try {
    // Rate limiting
    const identifier = request.headers.get("x-forwarded-for") || "unknown";
    const { success } = await rateLimit(identifier);

    if (!success) {
      return new Response(JSON.stringify({ error: "Rate limit exceeded" }), {
        status: 429,
        headers: { "Content-Type": "application/json" },
      });
    }

    const body = await request.json();
    const { text, type, count } = body;

    const aiService = new AiService();

    let result;
    switch (type) {
      case "flashcards":
        result = await aiService.generateFlashcards(text, count);
        break;
      case "translation":
        result = await aiService.translateText(text, body.targetLanguage);
        break;
      default:
        throw new Error("Invalid generation type");
    }

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("AI generation error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
```

### Krok 7: Testowanie

Utwórz plik `tests/openrouter.service.test.ts`:

```typescript
import { describe, it, expect, beforeEach, vi } from "vitest";
import { OpenRouterService } from "../src/lib/services/openrouter.service";

describe("OpenRouterService", () => {
  let service: OpenRouterService;

  beforeEach(() => {
    service = new OpenRouterService({
      apiKey: "test-key",
      defaultModel: "openai/gpt-4o-mini",
    });
  });

  it("should validate API key format", () => {
    expect(() => {
      new OpenRouterService({ apiKey: "invalid-key" });
    }).toThrow("Invalid API key format");
  });

  it("should send message with correct format", async () => {
    // Mock fetch
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ choices: [{ message: { content: "test" } }] }),
    });

    const result = await service.sendMessage({
      userMessage: "Test message",
      responseFormat: TRANSLATION_SCHEMA,
    });

    expect(result).toBeDefined();
  });
});
```

### Krok 8: Monitoring i logging

Dodaj do `src/lib/services/error-logger.ts`:

```typescript
export const logOpenRouterError = (error: Error, context: string) => {
  console.error("OpenRouter Error:", {
    message: error.message,
    context,
    timestamp: new Date().toISOString(),
    stack: error.stack,
  });

  // Można dodać integrację z systemem monitoringu
  // np. Sentry, LogRocket, etc.
};
```

### Krok 9: Dokumentacja API

Zaktualizuj `docs/ai-api.md`:

````markdown
# AI API Documentation

## Endpoints

### POST /api/ai/generate

Generuje treści AI na podstawie podanego tekstu.

**Request Body:**

```json
{
  "text": "Tekst do przetworzenia",
  "type": "flashcards|translation",
  "count": 5,
  "targetLanguage": "en"
}
```
````

**Response:**

```json
{
  "choices": [
    {
      "message": {
        "content": "{\"translation\": \"Hello world\", \"confidence\": 0.95}"
      }
    }
  ]
}
```

````

### Krok 10: Wdrożenie

1. Przetestuj lokalnie:
   ```bash
   npm run dev
````

2. Sprawdź testy:

   ```bash
   npm test
   ```

3. Wdróż na Cloudflare Pages:
   ```bash
   git push origin main
   ```

## Podsumowanie

Ten plan implementacji zapewnia:

- **Bezpieczeństwo**: Walidacja danych, rate limiting, bezpieczne przechowywanie kluczy
- **Wydajność**: Cache'owanie, retry logic, streaming
- **Obsługę błędów**: Kompleksowa obsługa różnych scenariuszy błędów
- **Elastyczność**: Konfigurowalne modele, parametry, schematy JSON
- **Monitoring**: Logging błędów i metryki użycia
- **Testowanie**: Unit testy i integracyjne testy API

Implementacja jest dostosowana do stacku technologicznego projektu i zapewnia solidną podstawę do dalszego rozwoju funkcjonalności AI.
