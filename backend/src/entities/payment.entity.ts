import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Participant } from './participant.entity';

@Entity('payments')
export class Payment {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  splitId!: string;

  @Column({ type: 'uuid' })
  participantId!: string;

  @Column({ type: 'varchar' })
  txHash!: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  amount!: number;

  @Column({ type: 'varchar' })
  asset!: string;

  @Column({ type: 'varchar', default: 'pending' })
  status!: 'pending' | 'confirmed' | 'failed' | 'partial';

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @ManyToOne(() => Participant, participant => participant.id)
  @JoinColumn({ name: 'participantId' })
  participant?: Participant;
}