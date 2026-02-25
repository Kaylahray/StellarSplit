// Data retention policies for audit trail
import fs from 'fs';
import path from 'path';

const LOG_PATH = path.join(__dirname, 'audit.log');

export function enforceRetention(days: number) {
  if (!fs.existsSync(LOG_PATH)) return;
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
  const lines = fs.readFileSync(LOG_PATH, 'utf-8').split('\n').filter(Boolean);
  const filtered = lines.filter(line => {
    const event = JSON.parse(line);
    return event.timestamp >= cutoff;
  });
  fs.writeFileSync(LOG_PATH, filtered.join('\n') + '\n');
}
