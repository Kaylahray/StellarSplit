import { Module } from '@nestjs/common';
import { SplitCalculationService } from './split-calculation.service';

/**
 * Module for split calculation functionality
 * Provides services for calculating bill splits across multiple types:
 * - Equal splits
 * - Itemized splits
 * - Percentage-based splits
 * - Custom amount splits
 */
@Module({
  providers: [SplitCalculationService],
  exports: [SplitCalculationService],
})
export class SplitsModule {}
