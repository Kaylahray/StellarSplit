import { Entity, PrimaryGeneratedColumn, Column, Unique, CreateDateColumn } from 'typeorm';

@Entity('user_reputations')
@Unique(['userId'])
export class UserReputation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string; // wallet address

  @Column('decimal', { default: 50 })
  trustScore: number;

  @Column('int', { default: 0 })
  totalSplitsParticipated: number;

  @Column('int', { default: 0 })
  totalSplitsPaidOnTime: number;

  @Column('int', { default: 0 })
  totalSplitsLate: number;

  @Column('int', { default: 0 })
  totalSplitsUnpaid: number;

  @Column('decimal', { default: 0 })
  averagePaymentDays: number;

  @Column({ type: 'timestamptz', nullable: true })
  lastScoreUpdate: Date;

  @Column('jsonb', { default: [] })
  scoreHistory: { score: number; date: string; reason: string }[];
}
