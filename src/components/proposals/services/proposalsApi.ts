import type { FlashcardBatchSaveRequest, FlashcardBatchSaveResponse, FlashcardBatchSaveItem } from "@/types";

export interface SaveBatchOptions {
  idempotencyKey: string;
}

export interface SaveBatchResult {
  success: boolean;
  data?: FlashcardBatchSaveResponse;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
}

/**
 * Save batch of accepted proposals to backend
 */
export async function saveBatch(items: FlashcardBatchSaveItem[], options: SaveBatchOptions): Promise<SaveBatchResult> {
  try {
    const request: FlashcardBatchSaveRequest = { items };

    const response = await fetch("/api/flashcards/batch-save", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Idempotency-Key": options.idempotencyKey,
      },
      body: JSON.stringify(request),
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: mapApiError(response.status, data),
      };
    }

    return {
      success: true,
      data: data as FlashcardBatchSaveResponse,
    };
  } catch (error) {
    // Network error or JSON parsing error
    return {
      success: false,
      error: {
        code: "network_error",
        message: "Błąd połączenia z serwerem",
      },
    };
  }
}

/**
 * Map API errors to user-friendly messages
 */
function mapApiError(status: number, data?: any): { code: string; message: string; details?: unknown } {
  switch (status) {
    case 401:
      return {
        code: "unauthorized",
        message: "Nie jesteś zalogowany. Zaloguj się, aby zapisać fiszki.",
        details: { redirectTo: "/auth/login" },
      };
    case 422:
      return {
        code: "validation_failed",
        message: "Niektóre fiszki przekraczają limity znaków. Sprawdź treść i spróbuj ponownie.",
        details: data?.details,
      };
    case 409:
      return {
        code: "conflict",
        message: "Niektóre fiszki już istnieją i zostały pominięte.",
        details: data?.skipped,
      };
    case 429:
      return {
        code: "rate_limited",
        message: "Zbyt wiele żądań. Spróbuj ponownie za chwilę.",
        details: { retryAfter: data?.retry_after },
      };
    case 503:
      return {
        code: "service_unavailable",
        message: "Serwis jest tymczasowo niedostępny. Spróbuj ponownie później.",
      };
    case 500:
      return {
        code: "server_error",
        message: "Błąd serwera. Spróbuj ponownie później.",
      };
    default:
      return {
        code: "unknown_error",
        message: "Nieoczekiwany błąd. Spróbuj ponownie.",
      };
  }
}
