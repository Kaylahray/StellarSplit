import { IsEnum, IsNotEmpty, IsNumber, IsOptional, IsArray, ValidateNested, Min, Max, IsString } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * Enum for split types supported by the application
 */
export enum SplitType {
  EQUAL = 'equal',
  ITEMIZED = 'itemized',
  PERCENTAGE = 'percentage',
  CUSTOM = 'custom',
}

/**
 * Enum for tip distribution methods
 */
export enum TipDistributionType {
  EQUAL = 'equal',
  PROPORTIONAL = 'proportional',
}

/**
 * DTO for individual items in an itemized split
 */
export class ItemDto {
  @IsNotEmpty()
  @IsString()
  name!: string;

  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  price!: number;

  @IsArray()
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  participantIds!: string[];
}

/**
 * DTO for percentage split configuration
 */
export class PercentageSplitDto {
  @IsNotEmpty()
  @IsString()
  participantId!: string;

  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  @Max(100)
  percentage!: number;
}

/**
 * DTO for custom split configuration
 */
export class CustomSplitDto {
  @IsNotEmpty()
  @IsString()
  participantId!: string;

  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  amount!: number;
}

/**
 * Main DTO for split calculation request
 */
export class CalculateSplitDto {
  @IsNotEmpty()
  @IsEnum(SplitType)
  splitType!: SplitType;

  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  subtotal!: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  tax?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  tip?: number;

  @IsOptional()
  @IsEnum(TipDistributionType)
  tipDistribution?: TipDistributionType;

  @IsArray()
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  participantIds!: string[];

  // For itemized split
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ItemDto)
  items?: ItemDto[];

  // For percentage split
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PercentageSplitDto)
  percentages?: PercentageSplitDto[];

  // For custom split
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CustomSplitDto)
  customAmounts?: CustomSplitDto[];
}

/**
 * DTO for individual participant's share in the response
 */
export class ParticipantShareDto {
  participantId!: string;
  subtotal!: number;
  tax!: number;
  tip!: number;
  total!: number;
  items?: string[]; // For itemized split - list of item names
}

/**
 * DTO for split calculation response
 */
export class SplitCalculationResultDto {
  splitType!: SplitType;
  originalSubtotal!: number;
  originalTax!: number;
  originalTip!: number;
  grandTotal!: number;
  shares!: ParticipantShareDto[];
  roundingAdjustment!: number; // Adjustment made to handle rounding errors
}
