export interface MonitoringConfig {
  // Alerting
  telegramEnabled: boolean;
  telegramChatId: string;
  telegramBotToken: string;
  
  // Logging
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  logToFile: boolean;
  logFilePath: string;
  
  // Performance Metrics
  trackPnL: boolean;
  trackDrawdown: boolean;
  trackWinRate: boolean;
  trackSharpeRatio: boolean;
  
  // Health Checks
  healthCheckInterval: number; // milliseconds
  maxLatency: number; // milliseconds
  maxMemoryUsage: number; // MB
  maxCpuUsage: number; // percentage
  
  // Alert Thresholds
  pnlAlertThreshold: number;
  drawdownAlertThreshold: number;
  errorAlertThreshold: number;
  latencyAlertThreshold: number;
  
  // Monitoring Endpoints
  prometheusEnabled: boolean;
  prometheusPort: number;
  grafanaEnabled: boolean;
  grafanaPort: number;
}

export const defaultMonitoringConfig: MonitoringConfig = {
  // Alerting
  telegramEnabled: true,
  telegramChatId: '',
  telegramBotToken: '',
  
  // Logging
  logLevel: 'info',
  logToFile: true,
  logFilePath: './logs/trading-bot.log',
  
  // Performance Metrics
  trackPnL: true,
  trackDrawdown: true,
  trackWinRate: true,
  trackSharpeRatio: true,
  
  // Health Checks
  healthCheckInterval: 60000, // 1 minute
  maxLatency: 1000, // 1 second
  maxMemoryUsage: 1024, // 1GB
  maxCpuUsage: 80, // 80%
  
  // Alert Thresholds
  pnlAlertThreshold: 0.1, // 10%
  drawdownAlertThreshold: 0.05, // 5%
  errorAlertThreshold: 5, // 5 errors per minute
  latencyAlertThreshold: 2000, // 2 seconds
  
  // Monitoring Endpoints
  prometheusEnabled: true,
  prometheusPort: 9090,
  grafanaEnabled: true,
  grafanaPort: 3000
};

export class MonitoringSystem {
  private config: MonitoringConfig;
  private metrics: Map<string, number>;
  private errorCount: number;
  private lastHealthCheck: number;
  
  constructor(config: Partial<MonitoringConfig> = {}) {
    this.config = { ...defaultMonitoringConfig, ...config };
    this.metrics = new Map();
    this.errorCount = 0;
    this.lastHealthCheck = Date.now();
  }
  
  public log(level: string, message: string, data?: any): void {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] ${level.toUpperCase()}: ${message}`;
    
    if (this.config.logToFile) {
      // Implement file logging
    }
    
    if (level === 'error') {
      this.errorCount++;
      this.checkErrorThreshold();
    }
  }
  
  public trackMetric(name: string, value: number): void {
    this.metrics.set(name, value);
    this.checkThresholds(name, value);
  }
  
  public async performHealthCheck(): Promise<boolean> {
    const now = Date.now();
    if (now - this.lastHealthCheck < this.config.healthCheckInterval) {
      return true;
    }
    
    this.lastHealthCheck = now;
    
    // Check system health
    const memoryUsage = process.memoryUsage().heapUsed / 1024 / 1024;
    const cpuUsage = process.cpuUsage();
    
    if (memoryUsage > this.config.maxMemoryUsage) {
      this.log('warn', `High memory usage: ${memoryUsage.toFixed(2)}MB`);
      return false;
    }
    
    return true;
  }
  
  private checkThresholds(metric: string, value: number): void {
    switch (metric) {
      case 'pnl':
        if (Math.abs(value) > this.config.pnlAlertThreshold) {
          this.sendAlert(`PnL threshold exceeded: ${value}`);
        }
        break;
      case 'drawdown':
        if (value > this.config.drawdownAlertThreshold) {
          this.sendAlert(`Drawdown threshold exceeded: ${value}`);
        }
        break;
    }
  }
  
  private checkErrorThreshold(): void {
    if (this.errorCount > this.config.errorAlertThreshold) {
      this.sendAlert(`Error threshold exceeded: ${this.errorCount} errors`);
      this.errorCount = 0;
    }
  }
  
  private async sendAlert(message: string): Promise<void> {
    if (this.config.telegramEnabled) {
      // Implement Telegram alert
    }
  }
} 