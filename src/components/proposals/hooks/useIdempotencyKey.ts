import { useMemo, useCallback } from "react";
import { useLocalStorage } from "@/lib/hooks/useLocalStorage";
import type { UUID } from "@/types";

const IDEMPOTENCY_KEY_PREFIX = "proposals.idempotency.";
const IDEMPOTENCY_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

interface IdempotencyKeyData {
  key: string;
  requestId: UUID;
  createdAt: string;
  expiresAt: string;
}

/**
 * Hook for managing idempotency key for proposals session
 */
export function useIdempotencyKey(requestId: UUID | undefined) {
  const [storedKey, setStoredKey] = useLocalStorage<IdempotencyKeyData | null>(
    `${IDEMPOTENCY_KEY_PREFIX}${requestId || "none"}`,
    null
  );

  // Generate stable idempotency key based on requestId
  const generateKey = useCallback((reqId: UUID): string => {
    // Create a deterministic key based on requestId and timestamp
    const timestamp = Math.floor(Date.now() / (5 * 60 * 1000)) * (5 * 60 * 1000); // Round to 5-minute intervals
    const keyData = `${reqId}-${timestamp}`;

    // Simple hash function for consistency
    let hash = 0;
    for (let i = 0; i < keyData.length; i++) {
      const char = keyData.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }

    return `proposals-${reqId}-${Math.abs(hash).toString(36)}`;
  }, []);

  // Get or create idempotency key
  const getKey = useCallback((): string | null => {
    if (!requestId) return null;

    // Check if we have a valid stored key
    if (storedKey && storedKey.requestId === requestId) {
      const now = new Date().getTime();
      const expiresAt = new Date(storedKey.expiresAt).getTime();

      if (now < expiresAt) {
        return storedKey.key;
      }
    }

    // Generate new key
    const newKey = generateKey(requestId);
    const now = new Date();
    const expiresAt = new Date(now.getTime() + IDEMPOTENCY_TTL_MS);

    const keyData: IdempotencyKeyData = {
      key: newKey,
      requestId,
      createdAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
    };

    setStoredKey(keyData);
    return newKey;
  }, [requestId, storedKey, generateKey, setStoredKey]);

  // Clear idempotency key (after successful save)
  const clearKey = useCallback(() => {
    if (requestId) {
      setStoredKey(null);
    }
  }, [requestId, setStoredKey]);

  // Check if key is valid
  const isValid = useMemo(() => {
    if (!storedKey || !requestId) return false;

    const now = new Date().getTime();
    const expiresAt = new Date(storedKey.expiresAt).getTime();

    return storedKey.requestId === requestId && now < expiresAt;
  }, [storedKey, requestId]);

  return {
    getKey,
    clearKey,
    isValid,
    key: getKey(),
  };
}
