import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { SavedTemplate } from "./entities/saved-template.entity";
import { SmartDefault } from "./entities/smart-default.entity";
import {
  SuggestionSource,
  TemplateSuggestionDto,
} from "./dtos/suggestion-response.dto";

@Injectable()
export class TemplateService {
  constructor(
    @InjectRepository(SavedTemplate)
    private savedRepo: Repository<SavedTemplate>,
    @InjectRepository(SmartDefault)
    private smartRepo: Repository<SmartDefault>,
  ) {}

  async getSuggestions(
    userId: string,
    participantCount?: number,
  ): Promise<TemplateSuggestionDto[]> {
    // Fetch both data sources
    const [saved, smart] = await Promise.all([
      this.savedRepo.find({
        where: { userId },
        order: { isPinned: "DESC", usageCount: "DESC" },
      }),
      this.smartRepo.find({ where: { userId } }),
    ]);

    const suggestions: TemplateSuggestionDto[] = [];
    const currentHour = new Date().getHours();

    // Map Saved Templates
    saved.forEach((t) => {
      let score = t.isPinned ? 2.0 : 1.0;
      // Boost if participant count matches exactly
      if (participantCount && t.defaultParticipants.length === participantCount)
        score += 0.5;

      suggestions.push({
        id: t.id,
        name: t.name,
        source: SuggestionSource.SAVED,
        splitType: t.splitType,
        taxPercentage: Number(t.taxPercentage),
        tipPercentage: Number(t.tipPercentage),
        participantCount: t.defaultParticipants.length,
        confidence: score,
        isPinned: t.isPinned,
      });
    });

    // Map Smart Defaults
    smart.forEach((s) => {
      let score = Number(s.confidenceScore);

      // Heuristic: Contextual time-of-day boost
      if (
        s.venueOrContext === "Dining" &&
        currentHour >= 11 &&
        currentHour <= 14
      )
        score += 0.3;
      if (
        participantCount &&
        Math.round(Number(s.averageParticipantCount)) === participantCount
      )
        score += 0.4;

      suggestions.push({
        name: `Suggested: ${s.venueOrContext}`,
        source: SuggestionSource.SMART,
        splitType: s.suggestedSplitType,
        taxPercentage: Number(s.typicalTaxPercentage),
        tipPercentage: Number(s.typicalTipPercentage),
        participantCount: Math.round(Number(s.averageParticipantCount)),
        confidence: score,
        isPinned: false,
      });
    });

    // Final Sorting: Highest confidence/score first
    return suggestions.sort((a, b) => b.confidence - a.confidence);
  }

  async create(userId: string, dto: any) {
    const template = this.savedRepo.create({ ...dto, userId });
    return this.savedRepo.save(template);
  }

  async findAll(userId: string) {
    return this.savedRepo.find({
      where: { userId },
      // Acceptance Criteria: Pinned first, then most used, then newest
      order: {
        isPinned: "DESC",
        usageCount: "DESC",
        createdAt: "DESC",
      },
    });
  }

  async togglePin(id: string, userId: string) {
    const template = await this.savedRepo.findOneByOrFail({ id, userId });
    template.isPinned = !template.isPinned;
    return this.savedRepo.save(template);
  }

  async incrementUsage(id: string, userId: string) {
    return this.savedRepo.update(
      { id, userId },
      {
        usageCount: () => '"usageCount" + 1',
        lastUsedAt: new Date(),
      },
    );
  }

  async update(id: string, userId: string, dto: any) {
    await this.savedRepo.update({ id, userId }, dto);
    return this.savedRepo.findOneBy({ id });
  }

  async remove(id: string, userId: string) {
    const result = await this.savedRepo.delete({ id, userId });
    return { deleted: result.affected ? result.affected > 0 : false };
  }
}
