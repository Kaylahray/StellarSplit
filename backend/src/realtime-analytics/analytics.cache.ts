// Redis caching for metrics with expiry and batch support
import Redis from 'ioredis';
import { PlatformMetrics } from './analytics.metrics';

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

export async function cacheMetrics(metric: PlatformMetrics) {
  await redis.set('platform_metrics', JSON.stringify(metric), 'EX', 10); // 10s expiry for real-time freshness
}

export async function getCachedMetrics(): Promise<PlatformMetrics | null> {
  const data = await redis.get('platform_metrics');
  return data ? JSON.parse(data) : null;
}
