import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  OneToMany,
} from "typeorm";
import { SettlementStep } from "./settlement-step.entity";

@Entity("settlement_suggestions")
export class SettlementSuggestion {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column()
  userId!: string; // wallet address

  @Column({ type: "decimal", precision: 15, scale: 7 })
  totalAmountOwed!: number;

  @Column({ type: "decimal", precision: 15, scale: 7 })
  totalAmountOwedTo!: number;

  @Column({ type: "decimal", precision: 15, scale: 7 })
  netPosition!: number;

  @Column({ default: "XLM" })
  suggestedAsset!: string;

  @Column({ type: "decimal", precision: 15, scale: 7, default: 0 })
  estimatedFeesXLM!: number;

  @Column({ default: false })
  wasActedOn!: boolean;

  @Column({ type: "timestamp" })
  expiresAt!: Date;

  @CreateDateColumn()
  generatedAt!: Date;

  @OneToMany(() => SettlementStep, (step) => step.suggestion, { cascade: true })
  steps!: SettlementStep[];
}
