import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Split } from '../../../entities/split.entity';
import { Participant } from '../../../entities/participant.entity';

export enum ReminderType {
  GENTLE = 'gentle',
  FIRM = 'firm',
  FINAL = 'final',
}

export enum ReminderChannel {
  EMAIL = 'email',
  PUSH = 'push',
  IN_APP = 'in_app',
}

export enum DeliveryStatus {
  SENT = 'sent',
  DELIVERED = 'delivered',
  FAILED = 'failed',
}

@Entity('reminder_logs')
export class ReminderLog {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  splitId!: string;

  @ManyToOne(() => Split)
  @JoinColumn({ name: 'splitId' })
  split!: Split;

  @Column({ type: 'uuid' })
  participantId!: string;

  @ManyToOne(() => Participant)
  @JoinColumn({ name: 'participantId' })
  participant!: Participant;

  @Column({
    type: 'enum',
    enum: ReminderType,
  })
  reminderType!: ReminderType;

  @Column({
    type: 'enum',
    enum: ReminderChannel,
  })
  channel!: ReminderChannel;

  @CreateDateColumn()
  sentAt!: Date;

  @Column({
    type: 'enum',
    enum: DeliveryStatus,
    default: DeliveryStatus.SENT,
  })
  deliveryStatus!: DeliveryStatus;
}
