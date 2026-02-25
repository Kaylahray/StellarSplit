import { SplitType } from "@/split-template/entities/split-template.entity";
import {
  Column,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";

@Entity("smart_defaults")
export class SmartDefault {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column()
  userId!: string;

  @Column()
  venueOrContext!: string; // e.g., "Dining", "Utilities", "General"

  @Column({ type: "enum", enum: SplitType })
  suggestedSplitType!: SplitType;

  @Column({ type: "decimal", precision: 10, scale: 2 })
  averageParticipantCount!: number;

  @Column({ type: "decimal", precision: 10, scale: 2 })
  averageTotalAmount!: number;

  @Column({ type: "decimal", precision: 5, scale: 2 })
  typicalTaxPercentage!: number;

  @Column({ type: "decimal", precision: 5, scale: 2 })
  typicalTipPercentage!: number;

  @Column({ type: "decimal", precision: 3, scale: 2 })
  confidenceScore!: number; // 0.00 to 1.00

  @Column()
  sampleSize!: number; // Number of splits analyzed

  @UpdateDateColumn()
  lastUpdated!: Date;
}
