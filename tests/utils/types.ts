export type TypeGuard<T> = (value: unknown) => value is T;

export type MockMetrics = {
  calls: number;
  averageExecutionTime: number;
  errors: number;
  lastCallTimestamp: number;
};

export type DebugInfo = {
  source: string;
  line: number;
  column: number;
  timestamp: number;
  mockId: string;
  state: any;
}; 