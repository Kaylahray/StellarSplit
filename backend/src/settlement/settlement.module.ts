import { Module, OnModuleInit } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { BullModule, InjectQueue } from "@nestjs/bull";
import { Queue } from "bull";

import { SettlementSuggestion } from "./entities/settlement-suggestions.entity";
import { SettlementStep } from "./entities/settlement-step.entity";
import { SettlementController } from "./settlement.controller";
import { SettlementService } from "./settlement.service";
import { SuggestionEngineService } from "./suggestion-engine.service";
import { StellarPayloadService } from "./stellar-payload.service";
import { SettlementProcessor } from "./settlement.processor";
import { Participant } from "@/entities/participant.entity";
import { User } from "../entities/user.entity";
import { StellarModule } from "../stellar/stellar.module";
import { EmailModule } from "../email/email.module";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      SettlementSuggestion,
      SettlementStep,
      Participant,
      User,
    ]),
    BullModule.registerQueue({ name: "settlement-tasks" }),
    StellarModule,
    EmailModule,
  ],
  controllers: [SettlementController],
  providers: [
    SettlementService,
    SuggestionEngineService,
    StellarPayloadService,
    SettlementProcessor,
  ],
})
export class SettlementModule implements OnModuleInit {
  constructor(
    @InjectQueue("settlement-tasks") private settlementQueue: Queue,
  ) {}

  async onModuleInit() {
    await this.settlementQueue.add(
      "send-weekly-settlement-digest",
      {},
      {
        repeat: { cron: "0 0 * * 0" },
        jobId: "weekly_digest",
      },
    );

    await this.settlementQueue.add(
      "cleanup-expired-suggestions",
      {},
      {
        repeat: { cron: "0 * * * *" },
        jobId: "hourly_cleanup",
      },
    );
  }
}
