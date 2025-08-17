// ============================================================================
// PERFORMANCE MONITORING SYSTEM
// ============================================================================

export interface PerformanceMetrics {
  operation: string;
  responseTime: number;
  memoryUsage?: number;
  cpuUsage?: number;
  userId?: string;
  requestId?: string;
  timestamp: number;
  success: boolean;
  error?: string;
  metadata?: Record<string, any>;
}

export interface APIMetrics extends PerformanceMetrics {
  endpoint: string;
  method: string;
  statusCode: number;
  requestSize?: number;
  responseSize?: number;
}

export interface AIMetrics extends PerformanceMetrics {
  model: string;
  tokensUsed?: number;
  inputLength: number;
  outputLength: number;
  cacheHit?: boolean;
  retryCount?: number;
}

// ============================================================================
// PERFORMANCE MONITOR CLASS
// ============================================================================

class PerformanceMonitor {
  private metrics: PerformanceMetrics[] = [];
  private maxMetrics = 1000; // Keep last 1000 metrics in memory
  private isEnabled = true;

  // ============================================================================
  // PUBLIC METHODS
  // ============================================================================

  /**
   * Start timing an operation
   */
  startTimer(operation: string): () => void {
    if (!this.isEnabled) {
      return () => {}; // No-op if disabled
    }

    const startTime = performance.now();
    const startMemory = this.getMemoryUsage();

    return (metadata?: Record<string, any>) => {
      this.recordMetric({
        operation,
        responseTime: performance.now() - startTime,
        memoryUsage: this.getMemoryUsage() - startMemory,
        timestamp: Date.now(),
        success: true,
        metadata
      });
    };
  }

  /**
   * Record API performance metrics
   */
  recordAPIMetric(metric: Omit<APIMetrics, 'timestamp'>): void {
    if (!this.isEnabled) return;

    this.recordMetric({
      ...metric,
      timestamp: Date.now()
    });
  }

  /**
   * Record AI operation metrics
   */
  recordAIMetric(metric: Omit<AIMetrics, 'timestamp'>): void {
    if (!this.isEnabled) return;

    this.recordMetric({
      ...metric,
      timestamp: Date.now()
    });
  }

  /**
   * Record error metrics
   */
  recordError(operation: string, error: Error, metadata?: Record<string, any>): void {
    if (!this.isEnabled) return;

    this.recordMetric({
      operation,
      responseTime: 0,
      timestamp: Date.now(),
      success: false,
      error: error.message,
      metadata
    });
  }

  /**
   * Get performance statistics
   */
  getStats(timeWindowMs: number = 60000): {
    totalRequests: number;
    averageResponseTime: number;
    errorRate: number;
    slowestOperations: Array<{ operation: string; avgTime: number }>;
    mostUsedOperations: Array<{ operation: string; count: number }>;
  } {
    const cutoff = Date.now() - timeWindowMs;
    const recentMetrics = this.metrics.filter(m => m.timestamp > cutoff);

    if (recentMetrics.length === 0) {
      return {
        totalRequests: 0,
        averageResponseTime: 0,
        errorRate: 0,
        slowestOperations: [],
        mostUsedOperations: []
      };
    }

    const successfulMetrics = recentMetrics.filter(m => m.success);
    const errorCount = recentMetrics.length - successfulMetrics.length;

    // Calculate average response time
    const totalResponseTime = successfulMetrics.reduce((sum, m) => sum + m.responseTime, 0);
    const averageResponseTime = totalResponseTime / successfulMetrics.length;

    // Group by operation for statistics
    const operationStats = new Map<string, { totalTime: number; count: number }>();
    
    successfulMetrics.forEach(metric => {
      const existing = operationStats.get(metric.operation) || { totalTime: 0, count: 0 };
      operationStats.set(metric.operation, {
        totalTime: existing.totalTime + metric.responseTime,
        count: existing.count + 1
      });
    });

    // Get slowest operations
    const slowestOperations = Array.from(operationStats.entries())
      .map(([operation, stats]) => ({
        operation,
        avgTime: stats.totalTime / stats.count
      }))
      .sort((a, b) => b.avgTime - a.avgTime)
      .slice(0, 5);

    // Get most used operations
    const mostUsedOperations = Array.from(operationStats.entries())
      .map(([operation, stats]) => ({
        operation,
        count: stats.count
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return {
      totalRequests: recentMetrics.length,
      averageResponseTime,
      errorRate: errorCount / recentMetrics.length,
      slowestOperations,
      mostUsedOperations
    };
  }

  /**
   * Get metrics for a specific operation
   */
  getOperationMetrics(operation: string, timeWindowMs: number = 60000): PerformanceMetrics[] {
    const cutoff = Date.now() - timeWindowMs;
    return this.metrics
      .filter(m => m.operation === operation && m.timestamp > cutoff)
      .sort((a, b) => b.timestamp - a.timestamp);
  }

  /**
   * Clear old metrics
   */
  clearOldMetrics(maxAgeMs: number = 3600000): void { // Default: 1 hour
    const cutoff = Date.now() - maxAgeMs;
    this.metrics = this.metrics.filter(m => m.timestamp > cutoff);
  }

  /**
   * Enable/disable monitoring
   */
  setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
  }

  /**
   * Export metrics for analysis
   */
  exportMetrics(): PerformanceMetrics[] {
    return [...this.metrics];
  }

  // ============================================================================
  // PRIVATE METHODS
  // ============================================================================

  private recordMetric(metric: PerformanceMetrics): void {
    this.metrics.push(metric);
    
    // Keep only the last maxMetrics
    if (this.metrics.length > this.maxMetrics) {
      this.metrics = this.metrics.slice(-this.maxMetrics);
    }

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      const level = metric.success ? 'info' : 'error';
      const message = `${metric.operation} - ${Math.round(metric.responseTime)}ms`;
      
      if (level === 'error') {
        console.error(`[PERF] ${message}`, metric.error);
      } else {
        console.info(`[PERF] ${message}`);
      }
    }
  }

  private getMemoryUsage(): number {
    if (typeof performance !== 'undefined' && 'memory' in performance) {
      return (performance as any).memory.usedJSHeapSize;
    }
    return 0;
  }
}

// ============================================================================
// GLOBAL INSTANCE
// ============================================================================

export const performanceMonitor = new PerformanceMonitor();

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Decorator for measuring function performance
 */
export function measurePerformance<T extends (...args: any[]) => any>(
  operation: string,
  fn: T
): T {
  return ((...args: Parameters<T>): ReturnType<T> => {
    const endTimer = performanceMonitor.startTimer(operation);
    
    try {
      const result = fn(...args);
      
      if (result instanceof Promise) {
        return result
          .then(value => {
            endTimer();
            return value;
          })
          .catch(error => {
            performanceMonitor.recordError(operation, error);
            throw error;
          }) as ReturnType<T>;
      } else {
        endTimer();
        return result;
      }
    } catch (error) {
      performanceMonitor.recordError(operation, error as Error);
      throw error;
    }
  }) as T;
}

/**
 * Middleware for measuring API performance
 */
export function createAPIPerformanceMiddleware() {
  return (req: any, res: any, next: any) => {
    const startTime = performance.now();
    const startMemory = performanceMonitor.getMemoryUsage();
    
    // Override res.end to capture response metrics
    const originalEnd = res.end;
    res.end = function(chunk: any, encoding: any) {
      const responseTime = performance.now() - startTime;
      const memoryUsage = performanceMonitor.getMemoryUsage() - startMemory;
      
      performanceMonitor.recordAPIMetric({
        operation: `${req.method} ${req.path}`,
        endpoint: req.path,
        method: req.method,
        statusCode: res.statusCode,
        responseTime,
        memoryUsage,
        userId: req.user?.id,
        requestId: req.headers['x-request-id'],
        success: res.statusCode < 400,
        requestSize: req.headers['content-length'] ? parseInt(req.headers['content-length']) : undefined,
        responseSize: chunk ? chunk.length : undefined
      });
      
      originalEnd.call(this, chunk, encoding);
    };
    
    next();
  };
}

/**
 * Health check endpoint data
 */
export function getHealthCheckData() {
  const stats = performanceMonitor.getStats();
  
  return {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    performance: {
      totalRequests: stats.totalRequests,
      averageResponseTime: Math.round(stats.averageResponseTime),
      errorRate: Math.round(stats.errorRate * 100) / 100,
      uptime: process.uptime()
    },
    memory: {
      used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
      total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
      external: Math.round(process.memoryUsage().external / 1024 / 1024)
    }
  };
}
