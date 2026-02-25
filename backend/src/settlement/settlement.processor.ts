import { Process, Processor } from "@nestjs/bull";
import { Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, LessThan } from "typeorm";
import { SettlementSuggestion } from "./entities/settlement-suggestions.entity";
import { SettlementService } from "./settlement.service";
import { EmailService } from "../email/email.service";
import { User } from "../entities/user.entity";

@Processor("settlement-tasks")
export class SettlementProcessor {
  private readonly logger = new Logger(SettlementProcessor.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(SettlementSuggestion)
    private readonly suggestionRepo: Repository<SettlementSuggestion>,
    private readonly settlementService: SettlementService,
    private readonly emailService: EmailService,
  ) {}

  /**
   * Weekly Cron Job: Runs every Sunday at Midnight
   * Analyzes net positions and sends a digest to users who owe money.
   */
  @Process("send-weekly-settlement-digest")
  async handleWeeklyDigest() {
    this.logger.log("Starting weekly settlement digest generation...");

    // Fetch all users (In production, batch this using a cursor/limit)
    const users = await this.userRepo.find();

    for (const user of users) {
      try {
        const isSnoozed = await this.settlementService.isSnoozed(user.id);
        if (isSnoozed) continue;

        const position = await this.settlementService.calculateNetPosition(
          (user as any).walletAddress,
        );

        if (position.net < 0) {
          await this.emailQueueWeeklyDigest(user, position);
        }
      } catch (error: any) {
        this.logger.error(
          `Failed to process digest for user ${user.id}: ${error.message}`,
        );
      }
    }
  }

  /**
   * Cleanup Job: Runs hourly
   * Removes expired settlement suggestions to keep the DB performant.
   */
  @Process("cleanup-expired-suggestions")
  async handleCleanup() {
    const result = await this.suggestionRepo.delete({
      expiresAt: LessThan(new Date()),
      wasActedOn: false,
    });
    this.logger.log(
      `Cleaned up ${result.affected} expired settlement suggestions.`,
    );
  }

  /**
   * Helper to interface with your existing EmailService logic
   */
  private async emailQueueWeeklyDigest(user: User, position: any) {
    await (this.emailService as any).emailQueue.add("sendEmail", {
      to: user.email,
      type: "settlement_digest",
      context: {
        userName: user.email.split("@")[0],
        totalOwed: Math.abs(position.owes),
        totalOwedToYou: position.owed,
        netPosition: position.net,
        currency: "XLM",
        actionLink: `${process.env.FRONTEND_URL}/settlements`,
      },
    });
  }
}
