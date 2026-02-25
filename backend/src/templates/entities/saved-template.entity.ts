import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from "typeorm";
import { SplitType } from "@/group/entities/group.entity";

@Entity("saved_templates")
export class SavedTemplate {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column()
  userId!: string; // wallet address

  @Column()
  name!: string;

  @Column({ type: "text", nullable: true })
  description?: string;

  @Column({ type: "enum", enum: SplitType })
  splitType!: SplitType;

  @Column({ type: "jsonb" })
  defaultParticipants!: { walletAddress: string; name: string }[];

  @Column({ type: "decimal", precision: 5, scale: 2, default: 0 })
  taxPercentage!: number;

  @Column({ type: "decimal", precision: 5, scale: 2, default: 0 })
  tipPercentage!: number;

  @Column({ default: "XLM" })
  currency!: string;

  @Column({ default: 0 })
  usageCount!: number;

  @Column({ default: false })
  isPinned!: boolean;

  @Column({ type: "timestamp", nullable: true })
  lastUsedAt?: Date;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
