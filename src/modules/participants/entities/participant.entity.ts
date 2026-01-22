import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Split } from '../../splits/entities/split.entity';

export enum PaymentStatus {
  PENDING = 'pending',
  PARTIAL = 'partial',
  PAID = 'paid',
}

@Entity('participants')
export class Participant {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  splitId: string;

  @ManyToOne(() => Split, (split) => split.participants, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'splitId' })
  split: Split;

  @Column()
  name: string;

  @Column()
  walletAddress: string;

  @Column({ nullable: true })
  email: string;

  @Column('decimal', { precision: 10, scale: 2 })
  amountOwed: number;

  @Column('decimal', { precision: 10, scale: 2, default: 0 })
  amountPaid: number;

  @Column({
    type: 'enum',
    enum: PaymentStatus,
    default: PaymentStatus.PENDING,
  })
  paymentStatus: PaymentStatus;

  @Column({ nullable: true })
  paymentTxHash: string;

  @Column({ default: false })
  notificationSent: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
