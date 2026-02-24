import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  Index,
} from 'typeorm';
import { Split } from '../../splits/entities/split.entity';
import { Participant } from '../../participants/entities/participant.entity';

export enum LinkType {
  VIEW_SPLIT = 'view_split',
  JOIN_SPLIT = 'join_split',
  PAY_SHARE = 'pay_share',
  NFC_TAP = 'nfc_tap',
}

@Entity('split_short_links')
export class SplitShortLink {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Split, { onDelete: 'CASCADE' })
  split: Split;

  @Index({ unique: true })
  @Column({ length: 6 })
  shortCode: string;

  @Column({ type: 'enum', enum: LinkType })
  linkType: LinkType;

  @ManyToOne(() => Participant, { nullable: true })
  targetParticipant?: Participant;

  @Column({ default: 0 })
  accessCount: number;

  @Column({ nullable: true })
  maxAccesses?: number;

  @Column()
  expiresAt: Date;

  @Column()
  createdBy: string; // wallet address

  @CreateDateColumn()
  createdAt: Date;
}