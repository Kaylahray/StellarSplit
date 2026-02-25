# Audit Trail System

Comprehensive audit trail for compliance, logging all actions, enforcing data retention, and supporting search/reporting.

## Features
- Log all actions
- Immutable audit trail (append-only)
- Compliance reporting
- User activity tracking
- Data retention policies

## Technical Implementation
- Event sourcing
- Append-only logs
- Elasticsearch for search
- Scheduled report generation

## Entry Points
- `eventStore.ts` (event sourcing, append-only log)
- `auditLogger.ts` (logging interface)
- `search.ts` (Elasticsearch integration)
- `report.ts` (scheduled report generation)
- `retention.ts` (data retention policies)
- `audit.test.ts` (tests)
