import { BadRequestException } from '@nestjs/common';
import {
  CalculateSplitDto,
  SplitType,
  ItemDto,
  PercentageSplitDto,
  CustomSplitDto,
} from '../dto/calculate-split.dto';

/**
 * Validator class for split calculation requests
 * Ensures data integrity and business rules are followed
 */
export class SplitValidator {
  /**
   * Main validation method that routes to specific validators based on split type
   */
  static validate(dto: CalculateSplitDto): void {
    // Validate basic requirements
    this.validateBasicRequirements(dto);

    // Validate specific split type
    switch (dto.splitType) {
      case SplitType.EQUAL:
        this.validateEqualSplit(dto);
        break;
      case SplitType.ITEMIZED:
        this.validateItemizedSplit(dto);
        break;
      case SplitType.PERCENTAGE:
        this.validatePercentageSplit(dto);
        break;
      case SplitType.CUSTOM:
        this.validateCustomSplit(dto);
        break;
      default:
        throw new BadRequestException('Invalid split type');
    }
  }

  /**
   * Validates basic requirements common to all split types
   */
  private static validateBasicRequirements(dto: CalculateSplitDto): void {
    // Ensure there are participants
    if (!dto.participantIds || dto.participantIds.length === 0) {
      throw new BadRequestException('At least one participant is required');
    }

    // Check for duplicate participant IDs
    const uniqueParticipants = new Set(dto.participantIds);
    if (uniqueParticipants.size !== dto.participantIds.length) {
      throw new BadRequestException('Duplicate participant IDs are not allowed');
    }

    // Validate monetary values
    if (dto.subtotal < 0) {
      throw new BadRequestException('Subtotal cannot be negative');
    }

    if (dto.tax !== undefined && dto.tax < 0) {
      throw new BadRequestException('Tax cannot be negative');
    }

    if (dto.tip !== undefined && dto.tip < 0) {
      throw new BadRequestException('Tip cannot be negative');
    }

    // Validate total is reasonable (at least subtotal)
    const total = dto.subtotal + (dto.tax || 0) + (dto.tip || 0);
    if (total <= 0 && dto.participantIds.length > 0) {
      throw new BadRequestException('Total amount must be greater than zero');
    }
  }

  /**
   * Validates equal split requirements
   */
  private static validateEqualSplit(dto: CalculateSplitDto): void {
    // No additional validation needed for equal split
    // Just ensure no extra data is provided
    if (dto.items || dto.percentages || dto.customAmounts) {
      throw new BadRequestException(
        'Equal split should not include items, percentages, or custom amounts',
      );
    }
  }

  /**
   * Validates itemized split requirements
   */
  private static validateItemizedSplit(dto: CalculateSplitDto): void {
    if (!dto.items || dto.items.length === 0) {
      throw new BadRequestException('Itemized split requires at least one item');
    }

    // Ensure items don't include percentages or custom amounts
    if (dto.percentages || dto.customAmounts) {
      throw new BadRequestException(
        'Itemized split should not include percentages or custom amounts',
      );
    }

    // Validate each item
    dto.items.forEach((item: ItemDto, index: number) => {
      // Ensure item has a name
      if (!item.name || item.name.trim() === '') {
        throw new BadRequestException(`Item at index ${index} must have a name`);
      }

      // Ensure item has a valid price
      if (item.price < 0) {
        throw new BadRequestException(
          `Item "${item.name}" has invalid price: ${item.price}`,
        );
      }

      // Ensure item has participants
      if (!item.participantIds || item.participantIds.length === 0) {
        throw new BadRequestException(
          `Item "${item.name}" must have at least one participant`,
        );
      }

      // Ensure all item participants are in the main participant list
      item.participantIds.forEach((participantId: string) => {
        if (!dto.participantIds.includes(participantId)) {
          throw new BadRequestException(
            `Item "${item.name}" has participant "${participantId}" who is not in the main participant list`,
          );
        }
      });

      // Check for duplicate participants in item
      const uniqueItemParticipants = new Set(item.participantIds);
      if (uniqueItemParticipants.size !== item.participantIds.length) {
        throw new BadRequestException(
          `Item "${item.name}" has duplicate participants`,
        );
      }
    });

    // Validate that total of items matches subtotal (with small tolerance for rounding)
    const itemsTotal = dto.items.reduce((sum, item) => sum + item.price, 0);
    const tolerance = 0.01; // 1 cent tolerance
    if (Math.abs(itemsTotal - dto.subtotal) > tolerance) {
      throw new BadRequestException(
        `Sum of item prices (${itemsTotal.toFixed(2)}) does not match subtotal (${dto.subtotal.toFixed(2)})`,
      );
    }
  }

  /**
   * Validates percentage split requirements
   */
  private static validatePercentageSplit(dto: CalculateSplitDto): void {
    if (!dto.percentages || dto.percentages.length === 0) {
      throw new BadRequestException(
        'Percentage split requires percentage configuration',
      );
    }

    // Ensure percentages don't include items or custom amounts
    if (dto.items || dto.customAmounts) {
      throw new BadRequestException(
        'Percentage split should not include items or custom amounts',
      );
    }

    // Validate each percentage entry
    const percentageMap = new Map<string, number>();
    dto.percentages.forEach((pct: PercentageSplitDto) => {
      // Ensure participant is in main list
      if (!dto.participantIds.includes(pct.participantId)) {
        throw new BadRequestException(
          `Percentage split includes participant "${pct.participantId}" who is not in the main participant list`,
        );
      }

      // Check for duplicate participants
      if (percentageMap.has(pct.participantId)) {
        throw new BadRequestException(
          `Duplicate percentage entry for participant "${pct.participantId}"`,
        );
      }

      // Validate percentage range
      if (pct.percentage < 0 || pct.percentage > 100) {
        throw new BadRequestException(
          `Invalid percentage ${pct.percentage} for participant "${pct.participantId}". Must be between 0 and 100`,
        );
      }

      percentageMap.set(pct.participantId, pct.percentage);
    });

    // Calculate total percentage
    const totalPercentage = Array.from(percentageMap.values()).reduce(
      (sum, pct) => sum + pct,
      0,
    );

    // Allow small tolerance for floating point errors
    const tolerance = 0.01;
    if (Math.abs(totalPercentage - 100) > tolerance) {
      throw new BadRequestException(
        `Total percentage (${totalPercentage.toFixed(2)}%) must equal 100%`,
      );
    }

    // Ensure all participants have a percentage
    dto.participantIds.forEach((participantId) => {
      if (!percentageMap.has(participantId)) {
        throw new BadRequestException(
          `Participant "${participantId}" is missing a percentage assignment`,
        );
      }
    });
  }

  /**
   * Validates custom split requirements
   */
  private static validateCustomSplit(dto: CalculateSplitDto): void {
    if (!dto.customAmounts || dto.customAmounts.length === 0) {
      throw new BadRequestException('Custom split requires custom amount configuration');
    }

    // Ensure custom amounts don't include items or percentages
    if (dto.items || dto.percentages) {
      throw new BadRequestException(
        'Custom split should not include items or percentages',
      );
    }

    // Validate each custom amount entry
    const amountMap = new Map<string, number>();
    dto.customAmounts.forEach((custom: CustomSplitDto) => {
      // Ensure participant is in main list
      if (!dto.participantIds.includes(custom.participantId)) {
        throw new BadRequestException(
          `Custom split includes participant "${custom.participantId}" who is not in the main participant list`,
        );
      }

      // Check for duplicate participants
      if (amountMap.has(custom.participantId)) {
        throw new BadRequestException(
          `Duplicate custom amount entry for participant "${custom.participantId}"`,
        );
      }

      // Validate amount
      if (custom.amount < 0) {
        throw new BadRequestException(
          `Invalid amount ${custom.amount} for participant "${custom.participantId}". Must be non-negative`,
        );
      }

      amountMap.set(custom.participantId, custom.amount);
    });

    // Calculate total custom amounts
    const totalCustom = Array.from(amountMap.values()).reduce(
      (sum, amt) => sum + amt,
      0,
    );

    // Validate that total matches subtotal (with small tolerance for rounding)
    const tolerance = 0.01; // 1 cent tolerance
    if (Math.abs(totalCustom - dto.subtotal) > tolerance) {
      throw new BadRequestException(
        `Sum of custom amounts (${totalCustom.toFixed(2)}) does not match subtotal (${dto.subtotal.toFixed(2)})`,
      );
    }

    // Ensure all participants have a custom amount
    dto.participantIds.forEach((participantId) => {
      if (!amountMap.has(participantId)) {
        throw new BadRequestException(
          `Participant "${participantId}" is missing a custom amount assignment`,
        );
      }
    });
  }

  /**
   * Validates the result to ensure totals match and no rounding errors exist beyond tolerance
   */
  static validateResult(
    dto: CalculateSplitDto,
    calculatedTotal: number,
    roundingAdjustment: number,
  ): void {
    const expectedTotal = dto.subtotal + (dto.tax || 0) + (dto.tip || 0);
    const tolerance = 0.01; // 1 cent tolerance

    if (Math.abs(calculatedTotal - expectedTotal) > tolerance) {
      throw new BadRequestException(
        `Calculated total (${calculatedTotal.toFixed(2)}) does not match expected total (${expectedTotal.toFixed(2)})`,
      );
    }

    // Ensure rounding adjustment is reasonable (within 1 cent per participant)
    const maxAdjustment = dto.participantIds.length * 0.01;
    if (Math.abs(roundingAdjustment) > maxAdjustment) {
      throw new BadRequestException(
        `Rounding adjustment (${roundingAdjustment.toFixed(2)}) exceeds reasonable threshold`,
      );
    }
  }
}
