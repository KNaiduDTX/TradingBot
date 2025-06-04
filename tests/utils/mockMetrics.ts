import { MockMetrics } from './types';

class MockMetricsCollector {
  private static metrics: Map<string, MockMetrics> = new Map();
  private static startTimes: Map<string, number> = new Map();

  static startTracking(mockId: string): void {
    this.startTimes.set(mockId, performance.now());
  }

  static endTracking(mockId: string, error?: Error): void {
    const startTime = this.startTimes.get(mockId);
    if (!startTime) return;

    const executionTime = performance.now() - startTime;
    const currentMetrics = this.metrics.get(mockId) || {
      calls: 0,
      averageExecutionTime: 0,
      errors: 0,
      lastCallTimestamp: 0
    };

    this.metrics.set(mockId, {
      calls: currentMetrics.calls + 1,
      averageExecutionTime:
        (currentMetrics.averageExecutionTime * currentMetrics.calls + executionTime) /
        (currentMetrics.calls + 1),
      errors: currentMetrics.errors + (error ? 1 : 0),
      lastCallTimestamp: Date.now()
    });

    this.startTimes.delete(mockId);
  }

  static getMetrics(mockId: string): MockMetrics | undefined {
    return this.metrics.get(mockId);
  }

  static clearMetrics(): void {
    this.metrics.clear();
    this.startTimes.clear();
  }
}

export { MockMetricsCollector }; 