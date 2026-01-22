import { Injectable } from '@nestjs/common';
import {
  CalculateSplitDto,
  SplitType,
  TipDistributionType,
  ParticipantShareDto,
  SplitCalculationResultDto,
  ItemDto,
} from './dto/calculate-split.dto';
import { SplitValidator } from './validators/split.validator';

/**
 * Service responsible for calculating bill splits
 * Handles equal, itemized, percentage, and custom splits
 * Ensures proper tax and tip distribution with accurate rounding
 */
@Injectable()
export class SplitCalculationService {
  /**
   * Main entry point for split calculation
   * Validates input and routes to appropriate calculation method
   */
  calculateSplit(dto: CalculateSplitDto): SplitCalculationResultDto {
    // Validate the request
    SplitValidator.validate(dto);

    // Calculate based on split type
    let shares: ParticipantShareDto[];
    switch (dto.splitType) {
      case SplitType.EQUAL:
        shares = this.calculateEqualSplit(dto);
        break;
      case SplitType.ITEMIZED:
        shares = this.calculateItemizedSplit(dto);
        break;
      case SplitType.PERCENTAGE:
        shares = this.calculatePercentageSplit(dto);
        break;
      case SplitType.CUSTOM:
        shares = this.calculateCustomSplit(dto);
        break;
      default:
        throw new Error('Invalid split type');
    }

    // Calculate totals and rounding adjustment
    const calculatedTotal = shares.reduce((sum, share) => sum + share.total, 0);
    const expectedTotal = dto.subtotal + (dto.tax || 0) + (dto.tip || 0);
    const roundingAdjustment = this.round(calculatedTotal - expectedTotal);

    // Apply rounding adjustment to the first participant (or largest share)
    if (Math.abs(roundingAdjustment) > 0.001) {
      shares = this.applyRoundingAdjustment(shares, roundingAdjustment);
    }

    // Validate the result
    const finalTotal = shares.reduce((sum, share) => sum + share.total, 0);
    SplitValidator.validateResult(dto, finalTotal, roundingAdjustment);

    return {
      splitType: dto.splitType,
      originalSubtotal: dto.subtotal,
      originalTax: dto.tax || 0,
      originalTip: dto.tip || 0,
      grandTotal: this.round(expectedTotal),
      shares,
      roundingAdjustment,
    };
  }

  /**
   * Calculate equal split - divide everything evenly
   */
  private calculateEqualSplit(dto: CalculateSplitDto): ParticipantShareDto[] {
    const participantCount = dto.participantIds.length;
    const subtotalPerPerson = dto.subtotal / participantCount;

    return dto.participantIds.map((participantId) => {
      const subtotal = this.round(subtotalPerPerson);
      const tax = this.distributeTax(subtotal, dto.subtotal, dto.tax || 0);
      const tip = this.distributeTip(
        subtotal,
        dto.subtotal,
        dto.tip || 0,
        dto.tipDistribution || TipDistributionType.EQUAL,
        participantCount,
      );
      const total = this.round(subtotal + tax + tip);

      return {
        participantId,
        subtotal,
        tax,
        tip,
        total,
      };
    });
  }

  /**
   * Calculate itemized split - each person pays for their items
   * Handles shared items (split among multiple people)
   */
  private calculateItemizedSplit(dto: CalculateSplitDto): ParticipantShareDto[] {
    const items = dto.items || [];
    const participantSubtotals = new Map<string, number>();
    const participantItems = new Map<string, string[]>();

    // Initialize all participants
    dto.participantIds.forEach((id) => {
      participantSubtotals.set(id, 0);
      participantItems.set(id, []);
    });

    // Distribute item costs
    items.forEach((item: ItemDto) => {
      const sharePerPerson = item.price / item.participantIds.length;

      item.participantIds.forEach((participantId) => {
        const currentSubtotal = participantSubtotals.get(participantId) || 0;
        participantSubtotals.set(participantId, currentSubtotal + sharePerPerson);

        const currentItems = participantItems.get(participantId) || [];
        currentItems.push(item.name);
        participantItems.set(participantId, currentItems);
      });
    });

    // Build shares with tax and tip
    return dto.participantIds.map((participantId) => {
      const subtotal = this.round(participantSubtotals.get(participantId) || 0);
      const tax = this.distributeTax(subtotal, dto.subtotal, dto.tax || 0);
      const tip = this.distributeTip(
        subtotal,
        dto.subtotal,
        dto.tip || 0,
        dto.tipDistribution || TipDistributionType.PROPORTIONAL,
        dto.participantIds.length,
      );
      const total = this.round(subtotal + tax + tip);

      return {
        participantId,
        subtotal,
        tax,
        tip,
        total,
        items: participantItems.get(participantId) || [],
      };
    });
  }

  /**
   * Calculate percentage split - each person pays a specified percentage
   */
  private calculatePercentageSplit(dto: CalculateSplitDto): ParticipantShareDto[] {
    const percentages = dto.percentages || [];
    const percentageMap = new Map<string, number>();

    percentages.forEach((pct) => {
      percentageMap.set(pct.participantId, pct.percentage);
    });

    return dto.participantIds.map((participantId) => {
      const percentage = percentageMap.get(participantId) || 0;
      const subtotal = this.round((dto.subtotal * percentage) / 100);
      const tax = this.distributeTax(subtotal, dto.subtotal, dto.tax || 0);
      const tip = this.distributeTip(
        subtotal,
        dto.subtotal,
        dto.tip || 0,
        dto.tipDistribution || TipDistributionType.PROPORTIONAL,
        dto.participantIds.length,
      );
      const total = this.round(subtotal + tax + tip);

      return {
        participantId,
        subtotal,
        tax,
        tip,
        total,
      };
    });
  }

  /**
   * Calculate custom split - each person pays a specified amount
   */
  private calculateCustomSplit(dto: CalculateSplitDto): ParticipantShareDto[] {
    const customAmounts = dto.customAmounts || [];
    const amountMap = new Map<string, number>();

    customAmounts.forEach((custom) => {
      amountMap.set(custom.participantId, custom.amount);
    });

    return dto.participantIds.map((participantId) => {
      const subtotal = this.round(amountMap.get(participantId) || 0);
      const tax = this.distributeTax(subtotal, dto.subtotal, dto.tax || 0);
      const tip = this.distributeTip(
        subtotal,
        dto.subtotal,
        dto.tip || 0,
        dto.tipDistribution || TipDistributionType.PROPORTIONAL,
        dto.participantIds.length,
      );
      const total = this.round(subtotal + tax + tip);

      return {
        participantId,
        subtotal,
        tax,
        tip,
        total,
      };
    });
  }

  /**
   * Distribute tax proportionally based on subtotal share
   */
  private distributeTax(
    participantSubtotal: number,
    totalSubtotal: number,
    totalTax: number,
  ): number {
    if (totalTax === 0 || totalSubtotal === 0) {
      return 0;
    }

    const proportion = participantSubtotal / totalSubtotal;
    return this.round(totalTax * proportion);
  }

  /**
   * Distribute tip either equally or proportionally
   */
  private distributeTip(
    participantSubtotal: number,
    totalSubtotal: number,
    totalTip: number,
    distribution: TipDistributionType,
    participantCount: number,
  ): number {
    if (totalTip === 0) {
      return 0;
    }

    if (distribution === TipDistributionType.EQUAL) {
      return this.round(totalTip / participantCount);
    } else {
      // Proportional distribution
      if (totalSubtotal === 0) {
        return this.round(totalTip / participantCount);
      }
      const proportion = participantSubtotal / totalSubtotal;
      return this.round(totalTip * proportion);
    }
  }

  /**
   * Apply rounding adjustment to ensure total matches exactly
   * Adjusts the participant with the largest share
   */
  private applyRoundingAdjustment(
    shares: ParticipantShareDto[],
    adjustment: number,
  ): ParticipantShareDto[] {
    if (shares.length === 0 || Math.abs(adjustment) < 0.001) {
      return shares;
    }

    // Find participant with largest total
    let maxIndex = 0;
    let maxTotal = shares[0].total;

    shares.forEach((share, index) => {
      if (share.total > maxTotal) {
        maxTotal = share.total;
        maxIndex = index;
      }
    });

    // Apply adjustment
    const adjustedShares = [...shares];
    adjustedShares[maxIndex] = {
      ...adjustedShares[maxIndex],
      total: this.round(adjustedShares[maxIndex].total - adjustment),
    };

    return adjustedShares;
  }

  /**
   * Round to 2 decimal places
   * Uses banker's rounding (round half to even) to minimize bias
   */
  private round(value: number): number {
    return Math.round(value * 100) / 100;
  }
}
