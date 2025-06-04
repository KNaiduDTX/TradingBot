import { DebugInfo } from './types';

class MockDebugger {
  private static debugInfo: Map<string, DebugInfo[]> = new Map();
  private static sourceMaps: Map<string, any> = new Map();
  private static debugMode: boolean = false;

  static enableDebugMode(): void {
    this.debugMode = true;
  }

  static disableDebugMode(): void {
    this.debugMode = false;
  }

  static captureDebugInfo(mockId: string, state: any): void {
    if (!this.debugMode) return;

    const stack = new Error().stack;
    const sourceMap = this.sourceMaps.get(mockId);
    
    if (stack && sourceMap) {
      const match = stack.match(/at\s+(.+)\s+\((.+):(\d+):(\d+)\)/);
      if (match) {
        const [, , file, line, column] = match;
        const debugInfo: DebugInfo = {
          source: file,
          line: parseInt(line),
          column: parseInt(column),
          timestamp: Date.now(),
          mockId,
          state
        };
        
        const history = this.debugInfo.get(mockId) || [];
        history.push(debugInfo);
        this.debugInfo.set(mockId, history);
      }
    }
  }

  static getDebugHistory(mockId: string): DebugInfo[] {
    return this.debugInfo.get(mockId) || [];
  }

  static clearDebugHistory(): void {
    this.debugInfo.clear();
    this.sourceMaps.clear();
  }
}

export { MockDebugger }; 