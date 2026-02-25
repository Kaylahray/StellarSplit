import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

export enum ExportFormat {
  CSV = 'csv',
  PDF = 'pdf',
  JSON = 'json',
  QBO = 'qbo',
  OFX = 'ofx',
}

export enum ExportStatus {
  QUEUED = 'queued',
  PROCESSING = 'processing',
  READY = 'ready',
  FAILED = 'failed',
}

@Entity('tax_export_requests')
export class TaxExportRequest {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar' })
  userId!: string; // Primary wallet address

  @Column({ type: 'enum', enum: ExportFormat })
  exportFormat!: ExportFormat;

  @Column({ type: 'date' })
  periodStart!: Date;

  @Column({ type: 'date' })
  periodEnd!: Date;

  @Column({ type: 'jsonb', nullable: true })
  filters?: {
    categories?: string[];
    minAmount?: number;
    participants?: string[];
  };

  @Column({ type: 'enum', enum: ExportStatus, default: ExportStatus.QUEUED })
  status!: ExportStatus;

  @Column({ type: 'string', nullable: true })
  fileUrl?: string;

  @Column({ type: 'integer', nullable: true })
  fileSize?: number;

  @Column({ type: 'integer', nullable: true, default: 0 })
  recordCount!: number;

  @CreateDateColumn()
  requestedAt!: Date;

  @Column({ type: 'timestamp', nullable: true })
  completedAt?: Date;

  @Column({ type: 'timestamp', nullable: true })
  expiresAt?: Date; // 48 hours after ready
}
