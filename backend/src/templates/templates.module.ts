import { BullModule, InjectQueue } from "@nestjs/bull";
import { Module, OnModuleInit } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Queue } from "bull";
import { SavedTemplate } from "./entities/saved-template.entity";
import { SmartDefault } from "./entities/smart-default.entity";
import { Split } from "@/entities/split.entity";
import { TemplateService } from "./templates.service";
import { TemplateProcessor } from "./templates.processor";
import { TemplateController } from "./templates.controller";

@Module({
  imports: [
    TypeOrmModule.forFeature([SavedTemplate, SmartDefault, Split]),
    BullModule.registerQueue({
      name: "template-tasks",
    }),
  ],
  providers: [TemplateService, TemplateProcessor],
  controllers: [TemplateController],
})
export class TemplatesModule implements OnModuleInit {
  constructor(@InjectQueue("template-tasks") private queue: Queue) {}

  async onModuleInit() {
    await this.queue.add(
      "recalculate-smart-defaults",
      {},
      {
        repeat: { cron: "0 0 * * 0" }, // Every Sunday at Midnight
        jobId: "weekly-smart-update",
      },
    );
  }
}
