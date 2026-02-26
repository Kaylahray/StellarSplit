import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

export enum ArchiveReason {
  COMPLETED = 'completed',
  EXPIRED = 'expired',
  MANUALLY_ARCHIVED = 'manually_archived',
  CANCELLED = 'cancelled',
}

@Entity('split_archives')
export class SplitArchive {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  originalSplitId!: string;

  @Column({ type: 'jsonb' })
  splitData!: any;

  @Column({ type: 'jsonb' })
  participantData!: any[];

  @Column({ type: 'jsonb' })
  paymentData!: any[];

  @Column({
    type: 'enum',
    enum: ArchiveReason,
  })
  archiveReason!: ArchiveReason;

  @CreateDateColumn()
  archivedAt!: Date;

  @Column({ type: 'varchar' })
  archivedBy!: string; // wallet address or "system"
}
