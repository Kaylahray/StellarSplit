import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { SplitCalculationService } from './split-calculation.service';
import {
  CalculateSplitDto,
  SplitType,
  TipDistributionType,
} from './dto/calculate-split.dto';

describe('SplitCalculationService', () => {
  let service: SplitCalculationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SplitCalculationService],
    }).compile();

    service = module.get<SplitCalculationService>(SplitCalculationService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('Equal Split', () => {
    it('should split bill equally among 2 participants', () => {
      const dto: CalculateSplitDto = {
        splitType: SplitType.EQUAL,
        subtotal: 100,
        tax: 10,
        tip: 15,
        participantIds: ['user1', 'user2'],
      };

      const result = service.calculateSplit(dto);

      expect(result.grandTotal).toBe(125);
      expect(result.shares).toHaveLength(2);
      expect(result.shares[0].subtotal).toBe(50);
      expect(result.shares[1].subtotal).toBe(50);

      // Check that totals sum up correctly
      const totalSum = result.shares.reduce((sum, share) => sum + share.total, 0);
      expect(Math.abs(totalSum - 125)).toBeLessThan(0.01);
    });

    it('should split bill equally among 3 participants with rounding', () => {
      const dto: CalculateSplitDto = {
        splitType: SplitType.EQUAL,
        subtotal: 100,
        tax: 0,
        tip: 0,
        participantIds: ['user1', 'user2', 'user3'],
      };

      const result = service.calculateSplit(dto);

      expect(result.grandTotal).toBe(100);
      expect(result.shares).toHaveLength(3);

      // Check that totals sum up correctly (rounding handled)
      const totalSum = result.shares.reduce((sum, share) => sum + share.total, 0);
      expect(Math.abs(totalSum - 100)).toBeLessThan(0.01);
    });

    it('should handle equal tip distribution', () => {
      const dto: CalculateSplitDto = {
        splitType: SplitType.EQUAL,
        subtotal: 100,
        tax: 0,
        tip: 15,
        tipDistribution: TipDistributionType.EQUAL,
        participantIds: ['user1', 'user2'],
      };

      const result = service.calculateSplit(dto);

      expect(result.shares[0].tip).toBe(7.5);
      expect(result.shares[1].tip).toBe(7.5);
    });

    it('should reject empty participant list', () => {
      const dto: CalculateSplitDto = {
        splitType: SplitType.EQUAL,
        subtotal: 100,
        participantIds: [],
      };

      expect(() => service.calculateSplit(dto)).toThrow(BadRequestException);
    });

    it('should reject duplicate participants', () => {
      const dto: CalculateSplitDto = {
        splitType: SplitType.EQUAL,
        subtotal: 100,
        participantIds: ['user1', 'user1'],
      };

      expect(() => service.calculateSplit(dto)).toThrow(BadRequestException);
    });
  });

  describe('Itemized Split', () => {
    it('should split items correctly with no shared items', () => {
      const dto: CalculateSplitDto = {
        splitType: SplitType.ITEMIZED,
        subtotal: 50,
        tax: 5,
        tip: 10,
        participantIds: ['user1', 'user2'],
        items: [
          { name: 'Pizza', price: 30, participantIds: ['user1'] },
          { name: 'Salad', price: 20, participantIds: ['user2'] },
        ],
      };

      const result = service.calculateSplit(dto);

      expect(result.grandTotal).toBe(65);
      expect(result.shares).toHaveLength(2);

      // User1 should pay more (30/50 of subtotal)
      const user1Share = result.shares.find((s) => s.participantId === 'user1');
      const user2Share = result.shares.find((s) => s.participantId === 'user2');

      expect(user1Share?.subtotal).toBe(30);
      expect(user2Share?.subtotal).toBe(20);

      // Tax should be proportional
      expect(user1Share?.tax).toBe(3); // 30/50 * 5
      expect(user2Share?.tax).toBe(2); // 20/50 * 5

      // Check items are tracked
      expect(user1Share?.items).toContain('Pizza');
      expect(user2Share?.items).toContain('Salad');
    });

    it('should handle shared items correctly', () => {
      const dto: CalculateSplitDto = {
        splitType: SplitType.ITEMIZED,
        subtotal: 60,
        tax: 0,
        tip: 0,
        participantIds: ['user1', 'user2', 'user3'],
        items: [
          { name: 'Appetizer', price: 30, participantIds: ['user1', 'user2', 'user3'] },
          { name: 'Entree1', price: 20, participantIds: ['user1'] },
          { name: 'Entree2', price: 10, participantIds: ['user2'] },
        ],
      };

      const result = service.calculateSplit(dto);

      const user1Share = result.shares.find((s) => s.participantId === 'user1');
      const user2Share = result.shares.find((s) => s.participantId === 'user2');
      const user3Share = result.shares.find((s) => s.participantId === 'user3');

      // User1: 30/3 + 20 = 30
      expect(user1Share?.subtotal).toBe(30);
      // User2: 30/3 + 10 = 20
      expect(user2Share?.subtotal).toBe(20);
      // User3: 30/3 = 10
      expect(user3Share?.subtotal).toBe(10);

      // Check shared item appears in all three
      expect(user1Share?.items).toContain('Appetizer');
      expect(user2Share?.items).toContain('Appetizer');
      expect(user3Share?.items).toContain('Appetizer');
    });

    it('should reject items that dont sum to subtotal', () => {
      const dto: CalculateSplitDto = {
        splitType: SplitType.ITEMIZED,
        subtotal: 100,
        participantIds: ['user1', 'user2'],
        items: [
          { name: 'Item1', price: 30, participantIds: ['user1'] },
          { name: 'Item2', price: 20, participantIds: ['user2'] },
        ],
      };

      expect(() => service.calculateSplit(dto)).toThrow(BadRequestException);
    });

    it('should reject items with invalid participants', () => {
      const dto: CalculateSplitDto = {
        splitType: SplitType.ITEMIZED,
        subtotal: 50,
        participantIds: ['user1', 'user2'],
        items: [
          { name: 'Item1', price: 30, participantIds: ['user1'] },
          { name: 'Item2', price: 20, participantIds: ['user3'] }, // user3 not in main list
        ],
      };

      expect(() => service.calculateSplit(dto)).toThrow(BadRequestException);
    });

    it('should reject itemized split without items', () => {
      const dto: CalculateSplitDto = {
        splitType: SplitType.ITEMIZED,
        subtotal: 100,
        participantIds: ['user1', 'user2'],
      };

      expect(() => service.calculateSplit(dto)).toThrow(BadRequestException);
    });
  });

  describe('Percentage Split', () => {
    it('should split by percentages correctly', () => {
      const dto: CalculateSplitDto = {
        splitType: SplitType.PERCENTAGE,
        subtotal: 100,
        tax: 10,
        tip: 20,
        participantIds: ['user1', 'user2'],
        percentages: [
          { participantId: 'user1', percentage: 60 },
          { participantId: 'user2', percentage: 40 },
        ],
      };

      const result = service.calculateSplit(dto);

      expect(result.grandTotal).toBe(130);

      const user1Share = result.shares.find((s) => s.participantId === 'user1');
      const user2Share = result.shares.find((s) => s.participantId === 'user2');

      expect(user1Share?.subtotal).toBe(60);
      expect(user2Share?.subtotal).toBe(40);

      // Tax should be proportional
      expect(user1Share?.tax).toBe(6); // 60/100 * 10
      expect(user2Share?.tax).toBe(4); // 40/100 * 10
    });

    it('should reject percentages that dont sum to 100', () => {
      const dto: CalculateSplitDto = {
        splitType: SplitType.PERCENTAGE,
        subtotal: 100,
        participantIds: ['user1', 'user2'],
        percentages: [
          { participantId: 'user1', percentage: 60 },
          { participantId: 'user2', percentage: 30 },
        ],
      };

      expect(() => service.calculateSplit(dto)).toThrow(BadRequestException);
    });

    it('should reject percentages with missing participant', () => {
      const dto: CalculateSplitDto = {
        splitType: SplitType.PERCENTAGE,
        subtotal: 100,
        participantIds: ['user1', 'user2'],
        percentages: [{ participantId: 'user1', percentage: 100 }],
      };

      expect(() => service.calculateSplit(dto)).toThrow(BadRequestException);
    });

    it('should reject percentages with invalid participant', () => {
      const dto: CalculateSplitDto = {
        splitType: SplitType.PERCENTAGE,
        subtotal: 100,
        participantIds: ['user1', 'user2'],
        percentages: [
          { participantId: 'user1', percentage: 50 },
          { participantId: 'user3', percentage: 50 }, // user3 not in main list
        ],
      };

      expect(() => service.calculateSplit(dto)).toThrow(BadRequestException);
    });

    it('should handle uneven percentage splits', () => {
      const dto: CalculateSplitDto = {
        splitType: SplitType.PERCENTAGE,
        subtotal: 100,
        tax: 0,
        tip: 0,
        participantIds: ['user1', 'user2', 'user3'],
        percentages: [
          { participantId: 'user1', percentage: 33.33 },
          { participantId: 'user2', percentage: 33.33 },
          { participantId: 'user3', percentage: 33.34 },
        ],
      };

      const result = service.calculateSplit(dto);

      // Total should still match
      const totalSum = result.shares.reduce((sum, share) => sum + share.total, 0);
      expect(Math.abs(totalSum - 100)).toBeLessThan(0.01);
    });
  });

  describe('Custom Split', () => {
    it('should handle custom amounts correctly', () => {
      const dto: CalculateSplitDto = {
        splitType: SplitType.CUSTOM,
        subtotal: 100,
        tax: 10,
        tip: 15,
        participantIds: ['user1', 'user2'],
        customAmounts: [
          { participantId: 'user1', amount: 70 },
          { participantId: 'user2', amount: 30 },
        ],
      };

      const result = service.calculateSplit(dto);

      expect(result.grandTotal).toBe(125);

      const user1Share = result.shares.find((s) => s.participantId === 'user1');
      const user2Share = result.shares.find((s) => s.participantId === 'user2');

      expect(user1Share?.subtotal).toBe(70);
      expect(user2Share?.subtotal).toBe(30);

      // Tax should be proportional
      expect(user1Share?.tax).toBe(7); // 70/100 * 10
      expect(user2Share?.tax).toBe(3); // 30/100 * 10
    });

    it('should reject custom amounts that dont sum to subtotal', () => {
      const dto: CalculateSplitDto = {
        splitType: SplitType.CUSTOM,
        subtotal: 100,
        participantIds: ['user1', 'user2'],
        customAmounts: [
          { participantId: 'user1', amount: 60 },
          { participantId: 'user2', amount: 30 },
        ],
      };

      expect(() => service.calculateSplit(dto)).toThrow(BadRequestException);
    });

    it('should reject custom amounts with missing participant', () => {
      const dto: CalculateSplitDto = {
        splitType: SplitType.CUSTOM,
        subtotal: 100,
        participantIds: ['user1', 'user2'],
        customAmounts: [{ participantId: 'user1', amount: 100 }],
      };

      expect(() => service.calculateSplit(dto)).toThrow(BadRequestException);
    });

    it('should allow zero amounts for some participants', () => {
      const dto: CalculateSplitDto = {
        splitType: SplitType.CUSTOM,
        subtotal: 100,
        tax: 0,
        tip: 0,
        participantIds: ['user1', 'user2'],
        customAmounts: [
          { participantId: 'user1', amount: 100 },
          { participantId: 'user2', amount: 0 },
        ],
      };

      const result = service.calculateSplit(dto);

      const user1Share = result.shares.find((s) => s.participantId === 'user1');
      const user2Share = result.shares.find((s) => s.participantId === 'user2');

      expect(user1Share?.subtotal).toBe(100);
      expect(user2Share?.subtotal).toBe(0);
    });
  });

  describe('Tax Distribution', () => {
    it('should distribute tax proportionally', () => {
      const dto: CalculateSplitDto = {
        splitType: SplitType.CUSTOM,
        subtotal: 100,
        tax: 8,
        tip: 0,
        participantIds: ['user1', 'user2'],
        customAmounts: [
          { participantId: 'user1', amount: 75 },
          { participantId: 'user2', amount: 25 },
        ],
      };

      const result = service.calculateSplit(dto);

      const user1Share = result.shares.find((s) => s.participantId === 'user1');
      const user2Share = result.shares.find((s) => s.participantId === 'user2');

      expect(user1Share?.tax).toBe(6); // 75/100 * 8
      expect(user2Share?.tax).toBe(2); // 25/100 * 8
    });

    it('should handle zero tax', () => {
      const dto: CalculateSplitDto = {
        splitType: SplitType.EQUAL,
        subtotal: 100,
        tax: 0,
        tip: 0,
        participantIds: ['user1', 'user2'],
      };

      const result = service.calculateSplit(dto);

      result.shares.forEach((share) => {
        expect(share.tax).toBe(0);
      });
    });
  });

  describe('Tip Distribution', () => {
    it('should distribute tip equally when specified', () => {
      const dto: CalculateSplitDto = {
        splitType: SplitType.CUSTOM,
        subtotal: 100,
        tax: 0,
        tip: 15,
        tipDistribution: TipDistributionType.EQUAL,
        participantIds: ['user1', 'user2'],
        customAmounts: [
          { participantId: 'user1', amount: 80 },
          { participantId: 'user2', amount: 20 },
        ],
      };

      const result = service.calculateSplit(dto);

      const user1Share = result.shares.find((s) => s.participantId === 'user1');
      const user2Share = result.shares.find((s) => s.participantId === 'user2');

      expect(user1Share?.tip).toBe(7.5);
      expect(user2Share?.tip).toBe(7.5);
    });

    it('should distribute tip proportionally by default', () => {
      const dto: CalculateSplitDto = {
        splitType: SplitType.CUSTOM,
        subtotal: 100,
        tax: 0,
        tip: 20,
        tipDistribution: TipDistributionType.PROPORTIONAL,
        participantIds: ['user1', 'user2'],
        customAmounts: [
          { participantId: 'user1', amount: 80 },
          { participantId: 'user2', amount: 20 },
        ],
      };

      const result = service.calculateSplit(dto);

      const user1Share = result.shares.find((s) => s.participantId === 'user1');
      const user2Share = result.shares.find((s) => s.participantId === 'user2');

      expect(user1Share?.tip).toBe(16); // 80/100 * 20
      expect(user2Share?.tip).toBe(4); // 20/100 * 20
    });

    it('should handle zero tip', () => {
      const dto: CalculateSplitDto = {
        splitType: SplitType.EQUAL,
        subtotal: 100,
        tax: 0,
        tip: 0,
        participantIds: ['user1', 'user2'],
      };

      const result = service.calculateSplit(dto);

      result.shares.forEach((share) => {
        expect(share.tip).toBe(0);
      });
    });
  });

  describe('Rounding and Edge Cases', () => {
    it('should handle rounding with 3-way split', () => {
      const dto: CalculateSplitDto = {
        splitType: SplitType.EQUAL,
        subtotal: 10,
        tax: 0,
        tip: 0,
        participantIds: ['user1', 'user2', 'user3'],
      };

      const result = service.calculateSplit(dto);

      // Total should still be 10 despite rounding
      const totalSum = result.shares.reduce((sum, share) => sum + share.total, 0);
      expect(Math.abs(totalSum - 10)).toBeLessThan(0.01);
    });

    it('should handle very small amounts', () => {
      const dto: CalculateSplitDto = {
        splitType: SplitType.EQUAL,
        subtotal: 0.03,
        tax: 0,
        tip: 0,
        participantIds: ['user1', 'user2'],
      };

      const result = service.calculateSplit(dto);

      const totalSum = result.shares.reduce((sum, share) => sum + share.total, 0);
      expect(Math.abs(totalSum - 0.03)).toBeLessThan(0.01);
    });

    it('should handle large numbers', () => {
      const dto: CalculateSplitDto = {
        splitType: SplitType.EQUAL,
        subtotal: 9999.99,
        tax: 800,
        tip: 1500,
        participantIds: ['user1', 'user2', 'user3'],
      };

      const result = service.calculateSplit(dto);

      expect(result.grandTotal).toBe(12299.99);
      const totalSum = result.shares.reduce((sum, share) => sum + share.total, 0);
      expect(Math.abs(totalSum - 12299.99)).toBeLessThan(0.01);
    });

    it('should ensure all amounts are rounded to 2 decimal places', () => {
      const dto: CalculateSplitDto = {
        splitType: SplitType.EQUAL,
        subtotal: 33.33,
        tax: 3.33,
        tip: 6.66,
        participantIds: ['user1', 'user2', 'user3'],
      };

      const result = service.calculateSplit(dto);

      result.shares.forEach((share) => {
        expect(share.subtotal).toEqual(
          Math.round(share.subtotal * 100) / 100,
        );
        expect(share.tax).toEqual(Math.round(share.tax * 100) / 100);
        expect(share.tip).toEqual(Math.round(share.tip * 100) / 100);
        expect(share.total).toEqual(Math.round(share.total * 100) / 100);
      });
    });

    it('should handle rounding adjustment tracking', () => {
      const dto: CalculateSplitDto = {
        splitType: SplitType.EQUAL,
        subtotal: 10,
        tax: 0,
        tip: 0,
        participantIds: ['user1', 'user2', 'user3'],
      };

      const result = service.calculateSplit(dto);

      // Rounding adjustment should be small
      expect(Math.abs(result.roundingAdjustment)).toBeLessThan(0.03);
    });
  });

  describe('Validation', () => {
    it('should reject negative subtotal', () => {
      const dto: CalculateSplitDto = {
        splitType: SplitType.EQUAL,
        subtotal: -100,
        participantIds: ['user1', 'user2'],
      };

      expect(() => service.calculateSplit(dto)).toThrow(BadRequestException);
    });

    it('should reject negative tax', () => {
      const dto: CalculateSplitDto = {
        splitType: SplitType.EQUAL,
        subtotal: 100,
        tax: -10,
        participantIds: ['user1', 'user2'],
      };

      expect(() => service.calculateSplit(dto)).toThrow(BadRequestException);
    });

    it('should reject negative tip', () => {
      const dto: CalculateSplitDto = {
        splitType: SplitType.EQUAL,
        subtotal: 100,
        tip: -5,
        participantIds: ['user1', 'user2'],
      };

      expect(() => service.calculateSplit(dto)).toThrow(BadRequestException);
    });
  });
});
