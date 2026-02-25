// Aggregation logic for metrics
import { PlatformMetrics } from './analytics.metrics';
import ClickHouse from '@apla/clickhouse';

const clickhouse = new ClickHouse({
  host: process.env.CLICKHOUSE_HOST || 'localhost',
  port: process.env.CLICKHOUSE_PORT || 8123,
  user: process.env.CLICKHOUSE_USER || 'default',
  password: process.env.CLICKHOUSE_PASSWORD || '',
  database: process.env.CLICKHOUSE_DB || 'analytics',
});

export async function aggregateMetrics(metric: PlatformMetrics) {
  // Insert metric into ClickHouse
  await clickhouse.insert('platform_metrics', metric);
}

export async function getAggregatedMetrics(): Promise<PlatformMetrics> {
  // Query ClickHouse for latest metrics, optimized for performance
  const rows = await clickhouse.query('SELECT splitsPerSecond, activeUsers, paymentSuccessRate, averageSettlementTime, geographicDistribution FROM platform_metrics ORDER BY timestamp DESC LIMIT 1');
  return rows[0] as PlatformMetrics;
}
