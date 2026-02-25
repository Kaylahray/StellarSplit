export enum SuggestionSource {
  SAVED = "saved",
  SMART = "smart",
}

export class TemplateSuggestionDto {
  id?: string;
  name!: string;
  source!: SuggestionSource;
  splitType!: string;
  taxPercentage!: number;
  tipPercentage!: number;
  participantCount!: number;
  confidence!: number; // Used for sorting internally
  isPinned!: boolean;
}
