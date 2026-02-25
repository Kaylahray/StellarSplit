import { ScoreCalculatorService } from '../../backend/src/reputation/score-calculator.service';
import { ReputationEventType } from '../../backend/src/reputation/enums/reputation-event-type.enum';

describe('ScoreCalculatorService', () => {
  let service: ScoreCalculatorService;

  beforeEach(() => {
    service = new ScoreCalculatorService();
  });

  it('should return +5 for paid_on_time', () => {
    expect(service.getImpact(ReputationEventType.PAID_ON_TIME)).toBe(5);
  });

  it('should return -3 for paid_late', () => {
    expect(service.getImpact(ReputationEventType.PAID_LATE)).toBe(-3);
  });

  it('should return -10 for unpaid_expired', () => {
    expect(service.getImpact(ReputationEventType.UNPAID_EXPIRED)).toBe(-10);
  });

  it('should return +2 for dispute_won', () => {
    expect(service.getImpact(ReputationEventType.DISPUTE_WON)).toBe(2);
  });

  it('should return -8 for dispute_lost', () => {
    expect(service.getImpact(ReputationEventType.DISPUTE_LOST)).toBe(-8);
  });

  it('should assign correct badge tiers', () => {
    expect(service.getBadge(20)).toBe('New');
    expect(service.getBadge(50)).toBe('Reliable');
    expect(service.getBadge(70)).toBe('Trusted');
    expect(service.getBadge(95)).toBe('Verified');
  });
});
