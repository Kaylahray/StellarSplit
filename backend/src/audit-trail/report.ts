// Scheduled report generation for compliance
import { readEvents } from './eventStore';
import fs from 'fs';
import path from 'path';

const REPORT_PATH = path.join(__dirname, 'audit-report.json');

export function generateReport() {
  const events = readEvents();
  const report = {
    generatedAt: new Date().toISOString(),
    totalEvents: events.length,
    actions: events.map(e => e.action),
    users: [...new Set(events.map(e => e.userId))],
  };
  fs.writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2));
  return report;
}
