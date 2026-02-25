import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';
import { ReputationEventType } from '../enums/reputation-event-type.enum';

@Entity('reputation_events')
export class ReputationEvent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  @Column({ type: 'enum', enum: ReputationEventType })
  eventType: ReputationEventType;

  @Column('decimal')
  scoreImpact: number;

  @Column()
  splitId: string;

  @CreateDateColumn()
  createdAt: Date;
}
