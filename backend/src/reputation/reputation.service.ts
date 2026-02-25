import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserReputation } from './entities/user-reputation.entity';
import { ReputationEvent } from './entities/reputation-event.entity';
import { ReputationEventType } from './enums/reputation-event-type.enum';
import { ScoreCalculatorService } from './score-calculator.service';

@Injectable()
export class ReputationService {
  constructor(
    @InjectRepository(UserReputation) private readonly userRepo: Repository<UserReputation>,
    @InjectRepository(ReputationEvent) private readonly eventRepo: Repository<ReputationEvent>,
    private readonly calculator: ScoreCalculatorService,
  ) {}

  async recordEvent(userId: string, splitId: string, eventType: ReputationEventType) {
    const impact = this.calculator.getImpact(eventType);

    const event = this.eventRepo.create({ userId, splitId, eventType, scoreImpact: impact });
    await this.eventRepo.save(event);

    let reputation = await this.userRepo.findOne({ where: { userId } });
    if (!reputation) {
      reputation = this.userRepo.create({ userId, trustScore: 50, scoreHistory: [] });
    }

    reputation.trustScore = Math.max(0, Math.min(100, reputation.trustScore + impact));
    reputation.lastScoreUpdate = new Date();
    reputation.scoreHistory.push({ score: reputation.trustScore, date: new Date().toISOString(), reason: eventType });

    // Update counters
    reputation.totalSplitsParticipated += 1;
    if (eventType === ReputationEventType.PAID_ON_TIME) reputation.totalSplitsPaidOnTime += 1;
    if (eventType === ReputationEventType.PAID_LATE) reputation.totalSplitsLate += 1;
    if (eventType === ReputationEventType.UNPAID_EXPIRED) reputation.totalSplitsUnpaid += 1;

    await this.userRepo.save(reputation);
    return reputation;
  }

  async getReputation(userId: string) {
    return this.userRepo.findOne({ where: { userId } });
  }

  async getHistory(userId: string) {
    return this.eventRepo.find({ where: { userId }, order: { createdAt: 'DESC' } });
  }

  async getBadge(userId: string) {
    const reputation = await this.getReputation(userId);
    if (!reputation || reputation.totalSplitsParticipated < 3) return { badge: 'Hidden' };
    return { badge: this.calculator.getBadge(reputation.trustScore) };
  }

  async leaderboard() {
    return this.userRepo.find({
      where: { totalSplitsParticipated: 3 },
      order: { trustScore: 'DESC' },
      take: 20,
    });
  }
}
