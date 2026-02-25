import { Process, Processor } from "@nestjs/bull";
import { Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, Between } from "typeorm";
import { Split } from "@/entities/split.entity";
import { SmartDefault } from "./entities/smart-default.entity";
import { SplitType } from "@/split-template/entities/split-template.entity";

@Processor("template-tasks")
export class TemplateProcessor {
  private readonly logger = new Logger(TemplateProcessor.name);

  constructor(
    @InjectRepository(Split)
    private readonly splitRepo: Repository<Split>,
    @InjectRepository(SmartDefault)
    private readonly smartRepo: Repository<SmartDefault>,
  ) {}

  @Process("recalculate-smart-defaults")
  async handleRecalculation() {
    this.logger.log("Starting weekly smart default calculation...");

    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

    // Get distinct users who have been active recently
    const activeUsers = await this.splitRepo
      .createQueryBuilder("split")
      .select("split.creatorWalletAddress", "wallet")
      .where("split.createdAt >= :date", { date: threeMonthsAgo })
      .distinct(true)
      .getRawMany();

    for (const { wallet } of activeUsers) {
      await this.calculateUserSmartDefaults(wallet, threeMonthsAgo);
    }

    this.logger.log("Smart default calculation finished.");
  }

  private async calculateUserSmartDefaults(wallet: string, since: Date) {
    // Aggregate split data for this specific user
    // We group by "General" context for now, but you could group by keywords in description
    const stats = await this.splitRepo
      .createQueryBuilder("s")
      .leftJoin("s.participants", "p")
      .select([
        "COUNT(DISTINCT s.id) as sample_size",
        "AVG(s.totalAmount) as avg_amount",
        "COUNT(p.id)::float / COUNT(DISTINCT s.id) as avg_participants",
      ])
      .where("s.creatorWalletAddress = :wallet", { wallet })
      .andWhere("s.createdAt >= :since", { since })
      .getRawOne();

    if (parseInt(stats.sample_size) < 3) return; // Need at least 3 splits to be "smart"

    // Determine the most common split type used by this user
    const mostCommonType = await this.splitRepo
      .createQueryBuilder("s")
      .select("s.description", "description")
      .addSelect("COUNT(*)", "count")
      .where("s.creatorWalletAddress = :wallet", { wallet })
      .groupBy("s.description")
      .orderBy("count", "DESC")
      .limit(1)
      .getRawOne();

    // Update or Create the SmartDefault entry
    const confidenceScore = Math.min(parseInt(stats.sample_size) / 20, 0.95);

    await this.smartRepo.upsert(
      {
        userId: wallet,
        venueOrContext: "General",
        suggestedSplitType: SplitType.EQUAL,
        averageParticipantCount: parseFloat(stats.avg_participants),
        averageTotalAmount: parseFloat(stats.avg_amount),
        typicalTaxPercentage: 0,
        typicalTipPercentage: 15,
        confidenceScore,
        sampleSize: parseInt(stats.sample_size),
      },
      ["userId", "venueOrContext"],
    );
  }
}
