import { Injectable } from '@nestjs/common';
import { ReputationEventType } from './enums/reputation-event-type.enum';

@Injectable()
export class ScoreCalculatorService {
  getImpact(eventType: ReputationEventType): number {
    switch (eventType) {
      case ReputationEventType.PAID_ON_TIME:
        return +5;
      case ReputationEventType.PAID_LATE:
        return -3;
      case ReputationEventType.UNPAID_EXPIRED:
        return -10;
      case ReputationEventType.DISPUTE_WON:
        return +2;
      case ReputationEventType.DISPUTE_LOST:
        return -8;
      default:
        return 0;
    }
  }

  getBadge(score: number): string {
    if (score <= 30) return 'New';
    if (score <= 60) return 'Reliable';
    if (score <= 85) return 'Trusted';
    return 'Verified';
  }
}
