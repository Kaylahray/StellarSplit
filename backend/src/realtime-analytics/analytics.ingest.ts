// Kafka consumer for metrics ingestion
import { Kafka, logLevel } from 'kafkajs';
import { PlatformMetrics } from './analytics.metrics';

const kafka = new Kafka({
  clientId: 'analytics-engine',
  brokers: [process.env.KAFKA_BROKER || 'localhost:9092'],
  logLevel: logLevel.ERROR,
});

const consumer = kafka.consumer({ groupId: 'analytics-group' });

export async function startMetricsIngestion(onMetric: (metric: PlatformMetrics) => void) {
  await consumer.connect();
  await consumer.subscribe({ topic: 'platform-metrics', fromBeginning: false });

  await consumer.run({
    eachMessage: async ({ message }) => {
      if (!message.value) return;
      const metric: PlatformMetrics = JSON.parse(message.value.toString());
      onMetric(metric);
    },
  });
}
