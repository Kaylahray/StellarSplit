// Metrics definitions and types
export interface PlatformMetrics {
  splitsPerSecond: number;
  activeUsers: number;
  paymentSuccessRate: number;
  averageSettlementTime: number;
  geographicDistribution: Record<string, number>;
}

export const METRIC_KEYS = [
  'splitsPerSecond',
  'activeUsers',
  'paymentSuccessRate',
  'averageSettlementTime',
  'geographicDistribution',
];
