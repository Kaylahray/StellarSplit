# Realtime Analytics Engine

This module implements real-time platform metrics using Kafka, ClickHouse, Redis, and WebSockets.

## Metrics
- Splits per second
- Active users
- Payment success rate
- Average settlement time
- Geographic distribution

## Stack
- Apache Kafka (streaming)
- ClickHouse (analytics)
- Redis (caching)
- WebSockets (delivery)

## Entry Points
- `analytics.ingest.ts` (Kafka consumer)
- `analytics.aggregate.ts` (aggregation logic)
- `analytics.cache.ts` (Redis caching)
- `analytics.websocket.ts` (WebSocket delivery)
- `analytics.metrics.ts` (metrics definitions)

## Tests
- `analytics.test.ts`
