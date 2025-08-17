/**
 * Simple in-memory fixed-window rate limiter used in middleware.
 * Not suitable for multi-instance deployments; intended for local/dev and basic protection.
 */
export type RateLimitResult = { limited: boolean; retryAfterSeconds?: number };

type StoreEntry = { count: number; start: number };

function getStore(): Map<string, StoreEntry> {
  const g = globalThis as any;
  if (!g.__RL_STORE__) g.__RL_STORE__ = new Map<string, StoreEntry>();
  return g.__RL_STORE__ as Map<string, StoreEntry>;
}

export function rateLimitPatchUserSettings(
  ipAddress: string | null | undefined,
  now: number = Date.now(),
  windowMs: number = 60_000,
  limit: number = 30
): RateLimitResult {
  const ip = ipAddress || "unknown";
  const key = `rl:usersettings:${ip}`;
  const store = getStore();
  const entry = store.get(key);
  if (!entry || now - entry.start > windowMs) {
    store.set(key, { count: 1, start: now });
    return { limited: false };
  }
  entry.count += 1;
  if (entry.count > limit) {
    const retryAfterSeconds = Math.ceil((entry.start + windowMs - now) / 1000);
    return { limited: true, retryAfterSeconds };
  }
  return { limited: false };
}
