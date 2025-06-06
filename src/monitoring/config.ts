import { AlertConfig } from '../types/monitoring';

export const monitoringConfig = {
  metricsPort: 9090,
  prometheusEnabled: true,
  logLevel: 'info',
  retentionPeriod: '15d',
  alertRules: [
    {
      name: 'high_error_rate',
      condition: 'rate(trade_errors_total[5m]) > 0.1',
      threshold: 0.1,
      duration: '5m',
      severity: 'error',
      description: 'Error rate exceeds 10% in the last 5 minutes',
    },
    {
      name: 'high_slippage',
      condition: 'trade_slippage > 0.02',
      threshold: 0.02,
      duration: '1m',
      severity: 'warning',
      description: 'Trade slippage exceeds 2%',
    },
    {
      name: 'low_liquidity',
      condition: 'token_liquidity < 10000',
      threshold: 10000,
      duration: '5m',
      severity: 'warning',
      description: 'Token liquidity below $10,000',
    },
    {
      name: 'high_memory_usage',
      condition: 'process_memory_usage_bytes / process_memory_limit_bytes > 0.8',
      threshold: 0.8,
      duration: '5m',
      severity: 'warning',
      description: 'Memory usage exceeds 80%',
    },
    {
      name: 'high_cpu_usage',
      condition: 'rate(process_cpu_seconds_total[5m]) > 0.8',
      threshold: 0.8,
      duration: '5m',
      severity: 'warning',
      description: 'CPU usage exceeds 80%',
    },
    {
      name: 'high_latency',
      condition: 'trade_execution_duration_seconds > 2',
      threshold: 2,
      duration: '1m',
      severity: 'warning',
      description: 'Trade execution latency exceeds 2 seconds',
    },
    {
      name: 'high_drawdown',
      condition: 'portfolio_drawdown > 0.1',
      threshold: 0.1,
      severity: 'error',
      description: 'Portfolio drawdown exceeds 10%',
    },
    {
      name: 'low_win_rate',
      condition: 'trade_win_rate < 0.4',
      threshold: 0.4,
      duration: '1h',
      severity: 'warning',
      description: 'Win rate below 40% in the last hour',
    },
  ] as AlertConfig[],
}; 