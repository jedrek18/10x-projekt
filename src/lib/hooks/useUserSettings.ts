import { useCallback } from "react";
import type { UserSettingsDTO, UserSettingsUpdateCommand } from "../../types";

interface ApiError {
  error: string;
  code: string;
  details?: Record<string, string[]>;
}

export function useUserSettings() {
  const load = useCallback(async (): Promise<UserSettingsDTO> => {
    const response = await fetch("/api/user-settings", {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      if (response.status === 401) {
        // Redirect to login - AuthGuard will handle this
        window.location.assign("/auth/login");
        throw new Error("Unauthorized");
      }

      if (response.status === 408) {
        throw new Error("Przekroczono limit czasu żądania. Spróbuj ponownie.");
      }

      if (response.status >= 500) {
        throw new Error("Błąd serwera. Spróbuj ponownie później.");
      }

      const errorData: ApiError = await response.json().catch(() => ({
        error: "Nieznany błąd",
        code: "unknown",
      }));

      throw new Error(errorData.error || "Nie udało się załadować ustawień");
    }

    return response.json();
  }, []);

  const update = useCallback(async (command: UserSettingsUpdateCommand): Promise<UserSettingsDTO> => {
    const response = await fetch("/api/user-settings", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(command),
    });

    if (!response.ok) {
      if (response.status === 401) {
        // Redirect to login - AuthGuard will handle this
        window.location.assign("/auth/login");
        throw new Error("Unauthorized");
      }

      if (response.status === 422) {
        const errorData: ApiError = await response.json().catch(() => ({
          error: "Błąd walidacji",
          code: "validation_failed",
        }));

        // Map validation errors to field-specific messages
        if (errorData.details) {
          const fieldErrors = Object.entries(errorData.details)
            .map(([field, messages]) => `${field}: ${messages.join(", ")}`)
            .join("; ");
          throw new Error(fieldErrors);
        }

        throw new Error(errorData.error || "Nieprawidłowe dane");
      }

      if (response.status === 429) {
        const retryAfter = response.headers.get("Retry-After");
        const retrySeconds = retryAfter ? parseInt(retryAfter, 10) : 60;
        throw new Error(`Zbyt wiele żądań. Spróbuj ponownie za ${retrySeconds} sekund.`);
      }

      if (response.status === 408) {
        throw new Error("Przekroczono limit czasu żądania. Spróbuj ponownie.");
      }

      if (response.status >= 500) {
        throw new Error("Błąd serwera. Spróbuj ponownie później.");
      }

      const errorData: ApiError = await response.json().catch(() => ({
        error: "Nieznany błąd",
        code: "unknown",
      }));

      throw new Error(errorData.error || "Nie udało się zapisać ustawień");
    }

    return response.json();
  }, []);

  return { load, update };
}
