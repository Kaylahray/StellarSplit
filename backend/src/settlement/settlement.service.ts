import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, MoreThan } from "typeorm";
import { SettlementStep, StepStatus } from "./entities/settlement-step.entity";
import { Participant } from "@/entities/participant.entity";
import { User } from "../entities/user.entity"; // Adjust path
import { StellarService } from "../stellar/stellar.service";

@Injectable()
export class SettlementService {
  private readonly logger = new Logger(SettlementService.name);

  constructor(
    @InjectRepository(SettlementStep)
    private stepRepo: Repository<SettlementStep>,
    @InjectRepository(Participant)
    private participantRepo: Repository<Participant>,
    @InjectRepository(User)
    private userRepo: Repository<User>,
    private stellarService: StellarService,
  ) {}

  /**
   * Verified a Stellar transaction and updates the local state
   */
  async verifyAndCompleteStep(
    stepId: string,
    txHash: string,
    userWallet: string,
  ) {
    // Fetch the Step
    const step = await this.stepRepo.findOne({
      where: { id: stepId, fromAddress: userWallet },
      relations: ["suggestion"],
    });

    if (!step) throw new NotFoundException("Settlement step not found");
    if (step.status === StepStatus.COMPLETED) return step;

    // Verify on Stellar via your StellarService
    const verification = await this.stellarService.verifyTransaction(txHash);

    if (!verification || !verification.valid) {
      throw new BadRequestException(
        "Transaction could not be verified on-chain",
      );
    }

    // Validation: Match sender, receiver, and amount
    // Note: We use parseFloat to handle the decimal/string conversion from Stellar
    const isMatch =
      verification.sender === userWallet &&
      verification.receiver === step.toAddress &&
      verification.amount >= Number(step.amount);

    if (!isMatch) {
      throw new BadRequestException(
        "Transaction details do not match the settlement step",
      );
    }

    // Update Database State (Atomic-ish)
    step.status = StepStatus.COMPLETED;

    // Update the participant records related to this settlement
    await this.participantRepo.update(
      { splitId: step.relatedSplitIds[0], walletAddress: userWallet },
      {
        status: "paid", // Or logic to handle 'partial' if amount was less
        amountPaid: () => `amount_paid + ${verification.amount}`,
      },
    );

    return await this.stepRepo.save(step);
  }

  async calculateNetPosition(walletAddress: string) {
    const stats = await this.participantRepo
      .createQueryBuilder("p")
      .select(
        "SUM(CASE WHEN p.walletAddress = :wallet THEN (p.amountOwed - p.amountPaid) ELSE 0 END)",
        "owes",
      )
      .addSelect(
        "SUM(CASE WHEN p.walletAddress != :wallet THEN (p.amountOwed - p.amountPaid) ELSE 0 END)",
        "owed",
      )
      .innerJoin("p.split", "s")
      .where("s.creatorWalletAddress = :wallet OR p.walletAddress = :wallet", {
        wallet: walletAddress,
      })
      .getRawOne();

    return {
      owes: parseFloat(stats.owes || 0),
      owed: parseFloat(stats.owed || 0),
      net: parseFloat(stats.owed || 0) - parseFloat(stats.owes || 0),
    };
  }

  /**
   * Persistence logic for the 7-day snooze
   */
  async snoozeSuggestions(userId: string) {
    const snoozeDate = new Date();
    snoozeDate.setDate(snoozeDate.getDate() + 7);

    // Assuming you add 'snoozedUntil' to your User entity
    await this.userRepo.update(userId, {
      // @ts-ignore: Assuming column exists per requirements
      snoozedUntil: snoozeDate,
    });

    return { snoozedUntil: snoozeDate };
  }

  /**
   * Helper for the Suggestions logic to check snooze status
   */
  async isSnoozed(userId: string): Promise<boolean> {
    const user = await this.userRepo.findOne({
      where: { id: userId, snoozedUntil: MoreThan(new Date()) },
    } as any);
    return !!user;
  }
}
