/**
 * Global configuration constants for the app.
 */

/** Maximum allowed byte size for telemetry event `properties` payload. */
export const EVENT_PROPERTIES_MAX_BYTES = 8 * 1024; // 8KB

/**
 * SRS defaults and limits
 */
export const SRS_DEFAULT_DAILY_GOAL = 20;
export const SRS_DEFAULT_NEW_LIMIT = 10;
export const SRS_MAX_NEW_PER_DAY_CAP = 10; // additional soft cap from UI/server
export const SRS_MIN_EASE_FACTOR = 1.3;
export const SRS_SHORT_RELEARNING_MINUTES = 10;
export const SRS_TIMEOUT_MS = 10000;
