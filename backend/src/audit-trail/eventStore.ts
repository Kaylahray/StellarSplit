// Event sourcing and append-only log
import fs from 'fs';
import path from 'path';

const LOG_PATH = path.join(__dirname, 'audit.log');

export function appendEvent(event: object) {
  const line = JSON.stringify({ ...event, timestamp: Date.now() }) + '\n';
  fs.appendFileSync(LOG_PATH, line);
}

export function readEvents() {
  if (!fs.existsSync(LOG_PATH)) return [];
  return fs.readFileSync(LOG_PATH, 'utf-8')
    .split('\n')
    .filter(Boolean)
    .map(line => JSON.parse(line));
}
