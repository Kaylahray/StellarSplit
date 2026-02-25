import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { In, Repository } from "typeorm";
import { Participant } from "@/entities/participant.entity";
import { SettlementSuggestion } from "./entities/settlement-suggestions.entity";
import { SettlementStep, StepStatus } from "./entities/settlement-step.entity";
import { StellarPayloadService } from "./stellar-payload.service";

@Injectable()
export class SuggestionEngineService {
  private readonly logger = new Logger(SuggestionEngineService.name);

  constructor(
    @InjectRepository(Participant)
    private participantRepo: Repository<Participant>,
    @InjectRepository(SettlementSuggestion)
    private suggestionRepo: Repository<SettlementSuggestion>,
    private stellarPayloadService: StellarPayloadService,
  ) {}

  async generateSuggestions(
    userId: string,
    walletAddress: string,
  ): Promise<SettlementSuggestion> {
    // Find all splits where the user OWES money (is a participant)
    const debts = await this.participantRepo.find({
      where: { walletAddress, status: In(["pending", "partial"]) },
      relations: ["split"],
    });

    // Find all splits where the user IS OWED money (is the creator)
    const credits = await this.participantRepo
      .createQueryBuilder("p")
      .innerJoin("p.split", "s")
      .where("s.creatorWalletAddress = :walletAddress", { walletAddress })
      .andWhere("p.status IN (:...statuses)", {
        statuses: ["pending", "partial"],
      })
      .andWhere("p.walletAddress != :walletAddress", { walletAddress })
      .getMany();

    // Calculate Totals
    const totalOwed = debts.reduce(
      (sum, d) => sum + (Number(d.amountOwed) - Number(d.amountPaid)),
      0,
    );
    const totalOwedTo = credits.reduce(
      (sum, c) => sum + (Number(c.amountOwed) - Number(c.amountPaid)),
      0,
    );

    const suggestion = this.suggestionRepo.create({
      userId,
      totalAmountOwed: totalOwed,
      totalAmountOwedTo: totalOwedTo,
      netPosition: totalOwedTo - totalOwed,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      steps: [],
    });

    // Create Settlement Steps (Prioritize: Largest debts first)
    const sortedDebts = debts.sort(
      (a, b) =>
        Number(b.amountOwed) -
        Number(b.amountPaid) -
        (Number(a.amountOwed) - Number(a.amountPaid)),
    );

    suggestion.steps = sortedDebts.map((debt, index) => {
      const remainingAmount = Number(debt.amountOwed) - Number(debt.amountPaid);
      return {
        stepOrder: index + 1,
        fromAddress: walletAddress,
        toAddress: debt.split?.creatorWalletAddress,
        amount: remainingAmount,
        assetCode: debt.split?.preferredCurrency || "XLM",
        relatedSplitIds: [debt.splitId],
        status: StepStatus.PENDING,
        stellarPaymentUri: this.stellarPayloadService.generatePaymentUri({
          destination: debt.split?.creatorWalletAddress || "",
          amount: remainingAmount.toString(),
          assetCode: debt.split?.preferredCurrency,
          memo: `Settlement for ${debt.split?.description || "Split"}`,
        }),
      } as SettlementStep;
    });

    return this.suggestionRepo.save(suggestion);
  }
}
