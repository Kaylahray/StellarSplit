import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from "typeorm";
import { SettlementSuggestion } from "./settlement-suggestions.entity";

export enum StepStatus {
  PENDING = "pending",
  COMPLETED = "completed",
  SKIPPED = "skipped",
}

@Entity("settlement_steps")
export class SettlementStep {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column()
  suggestionId!: string;

  @ManyToOne(() => SettlementSuggestion, (suggestion) => suggestion.steps)
  suggestion!: SettlementSuggestion;

  @Column()
  stepOrder!: number;

  @Column()
  fromAddress!: string;

  @Column()
  toAddress!: string;

  @Column({ type: "decimal", precision: 15, scale: 7 })
  amount!: number;

  @Column()
  assetCode!: string;

  @Column({ type: "jsonb" })
  relatedSplitIds!: string[];

  @Column({ type: "text" })
  stellarPaymentUri!: string; // SEP-0007 format

  @Column({ type: "enum", enum: StepStatus, default: StepStatus.PENDING })
  status!: StepStatus;
}
