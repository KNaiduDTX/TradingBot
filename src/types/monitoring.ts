export interface MetricLabels {
  [key: string]: string;
}

export interface TradeMetrics {
  totalTrades: number;
  successfulTrades: number;
  failedTrades: number;
  totalVolume: number;
  averageSlippage: number;
  averageExecutionTime: number;
  pnl: number;
}

export interface ErrorMetrics {
  totalErrors: number;
  errorTypes: {
    [key: string]: number;
  };
  lastError?: {
    type: string;
    message: string;
    timestamp: Date;
  };
}

export interface SystemMetrics {
  memoryUsage: number;
  cpuUsage: number;
  uptime: number;
  activeConnections: number;
  queueSize: number;
}

export interface AlertConfig {
  name: string;
  condition: string;
  threshold: number;
  duration: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
  description: string;
}

export interface Alert {
  id: string;
  config: AlertConfig;
  status: 'firing' | 'resolved';
  startTime: Date;
  endTime?: Date;
  value: number;
  labels: MetricLabels;
}

export interface MonitoringConfig {
  metricsPort: number;
  prometheusEnabled: boolean;
  alertRules: AlertConfig[];
  logLevel: string;
  retentionPeriod: string;
}

export interface MetricValue {
  value: number;
  timestamp: Date;
  labels: MetricLabels;
}

export interface TimeSeriesData {
  metric: string;
  values: MetricValue[];
  labels: MetricLabels;
} 