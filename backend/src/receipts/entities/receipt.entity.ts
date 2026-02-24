import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('receipts')
export class Receipt {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  splitId: string;

  @Column()
  uploadedBy: string; // wallet address

  @Column()
  originalFilename: string;

  @Column()
  storagePath: string; // S3 key or local path

  @Column('int')
  fileSize: number;

  @Column()
  mimeType: string;

  @Column({ nullable: true })
  thumbnailPath?: string;

  @Column({ default: false })
  ocrProcessed: boolean;

  @Column('decimal', { nullable: true })
  ocrConfidenceScore?: number;

  @Column('jsonb', { nullable: true })
  extractedData?: any;

  @Column({ default: false })
  isDeleted: boolean;

  @CreateDateColumn()
  createdAt: Date;
}
