import { SplitType } from "@/split-template/entities/split-template.entity";
import {
  IsString,
  IsOptional,
  IsEnum,
  IsArray,
  IsNumber,
  IsNotEmpty,
  Min,
  Max,
} from "class-validator";

export class ParticipantDto {
  @IsString()
  @IsNotEmpty()
  walletAddress!: string;

  @IsString()
  @IsNotEmpty()
  name!: string;
}

export class CreateTemplateDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(SplitType)
  splitType!: SplitType;

  @IsArray()
  @IsNotEmpty()
  defaultParticipants!: ParticipantDto[];

  @IsNumber()
  @Min(0)
  @Max(100)
  taxPercentage!: number;

  @IsNumber()
  @Min(0)
  @Max(100)
  tipPercentage!: number;

  @IsString()
  @IsOptional()
  currency?: string;
}
