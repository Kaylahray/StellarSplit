// Tests for audit trail system
import { appendEvent, readEvents } from './eventStore';
import { logAction } from './auditLogger';
import { generateReport } from './report';
import { enforceRetention } from './retention';

it('should append and read events', () => {
  appendEvent({ action: 'test', userId: 'user1', details: { foo: 'bar' } });
  const events = readEvents();
  expect(events.length).toBeGreaterThan(0);
});

it('should log actions', () => {
  logAction('login', 'user2', { ip: '127.0.0.1' });
  const events = readEvents();
  expect(events.some(e => e.action === 'login')).toBe(true);
});

it('should generate report', () => {
  const report = generateReport();
  expect(report.totalEvents).toBeGreaterThan(0);
});

it('should enforce retention', () => {
  enforceRetention(1); // 1 day
  const events = readEvents();
  expect(events.every(e => e.timestamp >= Date.now() - 24*60*60*1000)).toBe(true);
});
