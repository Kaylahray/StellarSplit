// Logging interface for audit trail
import { appendEvent } from './eventStore';

export function logAction(action: string, userId: string, details: object = {}) {
  appendEvent({ action, userId, details });
}
