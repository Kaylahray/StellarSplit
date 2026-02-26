import { Entity, PrimaryGeneratedColumn, Column, UpdateDateColumn } from 'typeorm';

export enum NotificationEventType {
  SPLIT_CREATED = 'split_created',
  PAYMENT_RECEIVED = 'payment_received',
  PAYMENT_REMINDER = 'payment_reminder',
  SPLIT_COMPLETED = 'split_completed',
  FRIEND_REQUEST = 'friend_request',
  GROUP_INVITE = 'group_invite',
}

@Entity('notification_preferences')
export class NotificationPreference {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  userId!: string;

  @Column({
    type: 'enum',
    enum: NotificationEventType,
    enumName: 'notification_event_type_enum',
  })
  eventType!: NotificationEventType;

  @Column({ default: true })
  pushEnabled!: boolean;

  @Column({ default: true })
  emailEnabled!: boolean;

  @Column({ type: 'time', nullable: true })
  quietHoursStart?: string;

  @Column({ type: 'time', nullable: true })
  quietHoursEnd?: string;

  @Column({ nullable: true })
  timezone?: string; // Store user timezone for quiet hours calculation

  @UpdateDateColumn()
  updatedAt!: Date;
}
