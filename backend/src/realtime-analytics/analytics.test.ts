// Tests for analytics engine
import { cacheMetrics, getCachedMetrics } from './analytics.cache';
import { aggregateMetrics, getAggregatedMetrics } from './analytics.aggregate';
import { PlatformMetrics } from './analytics.metrics';

describe('Analytics Engine', () => {
  const sampleMetric: PlatformMetrics = {
    splitsPerSecond: 10,
    activeUsers: 100,
    paymentSuccessRate: 0.98,
    averageSettlementTime: 2.5,
    geographicDistribution: { US: 50, UK: 30, IN: 20 },
  };

  it('should cache metrics in Redis', async () => {
    await cacheMetrics(sampleMetric);
    const cached = await getCachedMetrics();
    expect(cached).toEqual(sampleMetric);
  });

  it('should aggregate metrics in ClickHouse', async () => {
    await aggregateMetrics(sampleMetric);
    const aggregated = await getAggregatedMetrics();
    expect(aggregated).toMatchObject(sampleMetric);
  });
});
