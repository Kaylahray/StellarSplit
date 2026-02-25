// Entry point for real-time analytics engine
import { startMetricsIngestion } from './analytics.ingest';
import { aggregateMetrics } from './analytics.aggregate';
import { cacheMetrics } from './analytics.cache';
import { broadcastMetrics } from './analytics.websocket';

async function main() {
  await startMetricsIngestion(async (metric) => {
    await aggregateMetrics(metric);
    await cacheMetrics(metric);
    broadcastMetrics(metric);
  });
}

main().catch(err => {
  console.error('Analytics engine failed:', err);
});
