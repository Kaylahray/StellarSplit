import { ReputationService } from '../../backend/src/reputation/reputation.service';
import { ScoreCalculatorService } from '../../backend/src/reputation/score-calculator.service';
import { ReputationEventType } from '../../backend/src/reputation/enums/reputation-event-type.enum';
import { Repository } from 'typeorm';
import { UserReputation } from '../../backend/src/reputation/entities/user-reputation.entity';
import { ReputationEvent } from '../../backend/src/reputation/entities/reputation-event.entity';

describe('ReputationService', () => {
  let service: ReputationService;
  let userRepoMock: Partial<Repository<UserReputation>>;
  let eventRepoMock: Partial<Repository<ReputationEvent>>;
  let calculator: ScoreCalculatorService;

  beforeEach(() => {
    userRepoMock = {
      findOne: jest.fn(),
      save: jest.fn(),
      create: jest.fn(),
      find: jest.fn(),
    };
    eventRepoMock = {
      save: jest.fn(),
      create: jest.fn(),
      find: jest.fn(),
    };
    calculator = new ScoreCalculatorService();
    service = new ReputationService(userRepoMock as any, eventRepoMock as any, calculator);
  });

  it('should record on-time payment event and increase score', async () => {
    const user = { userId: 'wallet1', trustScore: 50, scoreHistory: [], totalSplitsParticipated: 0 } as UserReputation;
    (userRepoMock.findOne as jest.Mock).mockResolvedValue(user);
    (eventRepoMock.create as jest.Mock).mockReturnValue({});
    (eventRepoMock.save as jest.Mock).mockResolvedValue({});

    await service.recordEvent('wallet1', 'split1', ReputationEventType.PAID_ON_TIME);

    expect(userRepoMock.save).toHaveBeenCalledWith(expect.objectContaining({ trustScore: 55 }));
  });

  it('should record late payment event and decrease score', async () => {
    const user = { userId: 'wallet1', trustScore: 50, scoreHistory: [], totalSplitsParticipated: 0 } as UserReputation;
    (userRepoMock.findOne as jest.Mock).mockResolvedValue(user);

    await service.recordEvent('wallet1', 'split1', ReputationEventType.PAID_LATE);

    expect(userRepoMock.save).toHaveBeenCalledWith(expect.objectContaining({ trustScore: 47 }));
  });

  it('should record unpaid event and decrease score significantly', async () => {
    const user = { userId: 'wallet1', trustScore: 50, scoreHistory: [], totalSplitsParticipated: 0 } as UserReputation;
    (userRepoMock.findOne as jest.Mock).mockResolvedValue(user);

    await service.recordEvent('wallet1', 'split1', ReputationEventType.UNPAID_EXPIRED);

    expect(userRepoMock.save).toHaveBeenCalledWith(expect.objectContaining({ trustScore: 40 }));
  });

  it('should assign badge only if minimum 3 splits', async () => {
    const user = { userId: 'wallet1', trustScore: 70, totalSplitsParticipated: 2 } as UserReputation;
    (userRepoMock.findOne as jest.Mock).mockResolvedValue(user);

    const badge = await service.getBadge('wallet1');
    expect(badge).toEqual({ badge: 'Hidden' });
  });

  it('should assign correct badge when eligible', async () => {
    const user = { userId: 'wallet1', trustScore: 70, totalSplitsParticipated: 5 } as UserReputation;
    (userRepoMock.findOne as jest.Mock).mockResolvedValue(user);

    const badge = await service.getBadge('wallet1');
    expect(badge).toEqual({ badge: 'Trusted' });
  });

  it('should return leaderboard sorted by trustScore', async () => {
    const users = [
      { userId: 'wallet1', trustScore: 90, totalSplitsParticipated: 3 },
      { userId: 'wallet2', trustScore: 60, totalSplitsParticipated: 3 },
    ];
    (userRepoMock.find as jest.Mock).mockResolvedValue(users);

    const leaderboard = await service.leaderboard();
    expect(leaderboard[0].trustScore).toBeGreaterThanOrEqual(leaderboard[1].trustScore);
  });
});
