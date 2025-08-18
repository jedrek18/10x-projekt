// ============================================================================
// ADVANCED CACHE MANAGEMENT SYSTEM
// ============================================================================

export interface CacheEntry<T = any> {
  data: T;
  timestamp: number;
  ttl: number;
  accessCount: number;
  lastAccessed: number;
  size: number;
  tags?: string[];
}

export interface CacheConfig {
  maxSize: number; // Maximum cache size in bytes
  maxEntries: number; // Maximum number of entries
  defaultTtl: number; // Default TTL in milliseconds
  cleanupInterval: number; // Cleanup interval in milliseconds
  enableCompression: boolean; // Enable compression for large entries
}

export interface CacheStats {
  hits: number;
  misses: number;
  size: number;
  entries: number;
  hitRate: number;
  averageAccessTime: number;
}

// ============================================================================
// CACHE MANAGER CLASS
// ============================================================================

export class CacheManager {
  private cache = new Map<string, CacheEntry>();
  private config: CacheConfig;
  private stats = {
    hits: 0,
    misses: 0,
    totalAccessTime: 0,
    accessCount: 0,
  };
  private cleanupTimer?: NodeJS.Timeout;

  constructor(config: Partial<CacheConfig> = {}) {
    this.config = {
      maxSize: 100 * 1024 * 1024, // 100MB
      maxEntries: 1000,
      defaultTtl: 3600000, // 1 hour
      cleanupInterval: 300000, // 5 minutes
      enableCompression: true,
      ...config,
    };

    this.startCleanupTimer();
  }

  // ============================================================================
  // PUBLIC METHODS
  // ============================================================================

  /**
   * Set a value in cache
   */
  set<T>(
    key: string,
    data: T,
    options?: {
      ttl?: number;
      tags?: string[];
      size?: number;
    }
  ): void {
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttl: options?.ttl || this.config.defaultTtl,
      accessCount: 0,
      lastAccessed: Date.now(),
      size: options?.size || this.estimateSize(data),
      tags: options?.tags,
    };

    // Check if we need to evict entries
    this.ensureCapacity(entry.size);

    this.cache.set(key, entry);
  }

  /**
   * Get a value from cache
   */
  get<T>(key: string): T | null {
    const startTime = performance.now();
    const entry = this.cache.get(key) as CacheEntry<T> | undefined;

    if (!entry) {
      this.stats.misses++;
      this.updateAccessStats(performance.now() - startTime);
      return null;
    }

    // Check if entry is expired
    if (this.isExpired(entry)) {
      this.cache.delete(key);
      this.stats.misses++;
      this.updateAccessStats(performance.now() - startTime);
      return null;
    }

    // Update access statistics
    entry.accessCount++;
    entry.lastAccessed = Date.now();
    this.stats.hits++;
    this.updateAccessStats(performance.now() - startTime);

    return entry.data;
  }

  /**
   * Check if a key exists and is not expired
   */
  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;

    if (this.isExpired(entry)) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  /**
   * Delete a specific key
   */
  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear();
    this.resetStats();
  }

  /**
   * Clear entries by tags
   */
  clearByTags(tags: string[]): number {
    let deletedCount = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (entry.tags && tags.some((tag) => entry.tags!.includes(tag))) {
        this.cache.delete(key);
        deletedCount++;
      }
    }

    return deletedCount;
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    const totalRequests = this.stats.hits + this.stats.misses;
    const hitRate = totalRequests > 0 ? this.stats.hits / totalRequests : 0;
    const averageAccessTime = this.stats.accessCount > 0 ? this.stats.totalAccessTime / this.stats.accessCount : 0;

    let totalSize = 0;
    for (const entry of this.cache.values()) {
      totalSize += entry.size;
    }

    return {
      hits: this.stats.hits,
      misses: this.stats.misses,
      size: totalSize,
      entries: this.cache.size,
      hitRate,
      averageAccessTime,
    };
  }

  /**
   * Get cache keys
   */
  keys(): string[] {
    return Array.from(this.cache.keys());
  }

  /**
   * Get cache entries with metadata
   */
  entries(): { key: string; entry: CacheEntry }[] {
    return Array.from(this.cache.entries()).map(([key, entry]) => ({ key, entry }));
  }

  /**
   * Warm up cache with multiple entries
   */
  warmup(entries: { key: string; data: any; ttl?: number; tags?: string[] }[]): void {
    for (const { key, data, ttl, tags } of entries) {
      this.set(key, data, { ttl, tags });
    }
  }

  /**
   * Preload data for frequently accessed keys
   */
  async preload<T>(
    keys: string[],
    loader: (key: string) => Promise<T>,
    options?: { ttl?: number; tags?: string[] }
  ): Promise<void> {
    const promises = keys.map(async (key) => {
      try {
        const data = await loader(key);
        this.set(key, data, options);
      } catch (error) {
        console.warn(`Failed to preload cache key: ${key}`, error);
      }
    });

    await Promise.all(promises);
  }

  // ============================================================================
  // PRIVATE METHODS
  // ============================================================================

  private isExpired(entry: CacheEntry): boolean {
    return Date.now() - entry.timestamp > entry.ttl;
  }

  private estimateSize(data: any): number {
    try {
      const serialized = JSON.stringify(data);
      return new Blob([serialized]).size;
    } catch {
      // Fallback estimation
      return 1024; // 1KB default
    }
  }

  private ensureCapacity(newEntrySize: number): void {
    let currentSize = 0;
    for (const entry of this.cache.values()) {
      currentSize += entry.size;
    }

    // If adding this entry would exceed max size, evict entries
    if (currentSize + newEntrySize > this.config.maxSize) {
      this.evictEntries(newEntrySize);
    }

    // If we have too many entries, evict some
    if (this.cache.size >= this.config.maxEntries) {
      this.evictEntries(0, this.config.maxEntries / 2);
    }
  }

  private evictEntries(requiredSpace = 0, targetEntries?: number): void {
    const entries = Array.from(this.cache.entries())
      .map(([key, entry]) => ({ key, entry }))
      .sort((a, b) => {
        // Sort by access count (LRU) and then by last accessed time
        if (a.entry.accessCount !== b.entry.accessCount) {
          return a.entry.accessCount - b.entry.accessCount;
        }
        return a.entry.lastAccessed - b.entry.lastAccessed;
      });

    let freedSpace = 0;
    let deletedCount = 0;
    const targetCount = targetEntries || Math.ceil(this.cache.size * 0.2); // Remove 20% by default

    for (const { key, entry } of entries) {
      if (deletedCount >= targetCount && freedSpace >= requiredSpace) {
        break;
      }

      this.cache.delete(key);
      freedSpace += entry.size;
      deletedCount++;
    }

    if (process.env.NODE_ENV === "development") {
      console.info(`[CACHE] Evicted ${deletedCount} entries, freed ${Math.round(freedSpace / 1024)}KB`);
    }
  }

  private startCleanupTimer(): void {
    this.cleanupTimer = setInterval(() => {
      this.cleanup();
    }, this.config.cleanupInterval);
  }

  private cleanup(): void {
    const beforeSize = this.cache.size;

    for (const [key, entry] of this.cache.entries()) {
      if (this.isExpired(entry)) {
        this.cache.delete(key);
      }
    }

    const afterSize = this.cache.size;
    const cleanedCount = beforeSize - afterSize;

    if (cleanedCount > 0 && process.env.NODE_ENV === "development") {
      console.info(`[CACHE] Cleaned up ${cleanedCount} expired entries`);
    }
  }

  private updateAccessStats(accessTime: number): void {
    this.stats.totalAccessTime += accessTime;
    this.stats.accessCount++;
  }

  private resetStats(): void {
    this.stats = {
      hits: 0,
      misses: 0,
      totalAccessTime: 0,
      accessCount: 0,
    };
  }

  // ============================================================================
  // CLEANUP
  // ============================================================================

  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }
    this.cache.clear();
  }
}

// ============================================================================
// GLOBAL CACHE INSTANCES
// ============================================================================

// Main cache for general use
export const mainCache = new CacheManager({
  maxSize: 50 * 1024 * 1024, // 50MB
  maxEntries: 500,
  defaultTtl: 1800000, // 30 minutes
});

// AI-specific cache with longer TTL
export const aiCache = new CacheManager({
  maxSize: 100 * 1024 * 1024, // 100MB
  maxEntries: 1000,
  defaultTtl: 3600000, // 1 hour
  tags: ["ai"],
});

// User-specific cache with shorter TTL
export const userCache = new CacheManager({
  maxSize: 25 * 1024 * 1024, // 25MB
  maxEntries: 200,
  defaultTtl: 900000, // 15 minutes
  tags: ["user"],
});

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Cache decorator for functions
 */
export function cached<T extends (...args: any[]) => any>(
  cache: CacheManager,
  keyGenerator: (...args: Parameters<T>) => string,
  options?: { ttl?: number; tags?: string[] }
) {
  return (fn: T): T => {
    return ((...args: Parameters<T>): ReturnType<T> => {
      const key = keyGenerator(...args);
      const cached = cache.get(key);

      if (cached !== null) {
        return cached;
      }

      const result = fn(...args);

      if (result instanceof Promise) {
        return result.then((value) => {
          cache.set(key, value, options);
          return value;
        }) as ReturnType<T>;
      } else {
        cache.set(key, result, options);
        return result;
      }
    }) as T;
  };
}

/**
 * Generate cache key from function name and arguments
 */
export function generateCacheKey(prefix: string, ...args: any[]): string {
  const argsString = args
    .map((arg) => {
      if (typeof arg === "object") {
        return JSON.stringify(arg);
      }
      return String(arg);
    })
    .join(":");

  return `${prefix}:${argsString}`;
}

/**
 * Clear all caches
 */
export function clearAllCaches(): void {
  mainCache.clear();
  aiCache.clear();
  userCache.clear();
}

/**
 * Get combined cache statistics
 */
export function getAllCacheStats(): Record<string, CacheStats> {
  return {
    main: mainCache.getStats(),
    ai: aiCache.getStats(),
    user: userCache.getStats(),
  };
}
