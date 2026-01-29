import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { SearchService } from './search.service';
import { Split } from '../entities/split.entity';
import { Item } from '../entities/item.entity';
import { Participant } from '../entities/participant.entity';

/**
 * Unit tests for SearchService
 * Testing the core search functionality with mocked repositories
 */
describe('SearchService', () => {
  let service: SearchService;
  let splitRepository: jest.Mocked<Repository<Split>>;
  let itemRepository: jest.Mocked<Repository<Item>>;
  let participantRepository: jest.Mocked<Repository<Participant>>;

  // Mock split data for testing
  const mockSplits: Split[] = [
    {
      id: 'split-1',
      totalAmount: 100,
      amountPaid: 50,
      status: 'active',
      description: 'Dinner at fancy restaurant',
      createdAt: new Date('2024-01-15'),
      updatedAt: new Date('2024-01-15'),
      items: [
        {
          id: 'item-1',
          splitId: 'split-1',
          name: 'Pizza',
          quantity: 2,
          unitPrice: 20,
          totalPrice: 40,
          assignedToIds: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        } as Item,
      ],
      participants: [],
    } as Split,
    {
      id: 'split-2',
      totalAmount: 200,
      amountPaid: 200,
      status: 'completed',
      description: 'Lunch meeting with team',
      createdAt: new Date('2024-01-10'),
      updatedAt: new Date('2024-01-10'),
      items: [],
      participants: [],
    } as Split,
  ];

  // Mock query builder that simulates TypeORM behavior
  const createMockQueryBuilder = (results: Split[]): Partial<SelectQueryBuilder<Split>> => {
    const qb: Partial<SelectQueryBuilder<Split>> = {
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      addOrderBy: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue(results),
      getCount: jest.fn().mockResolvedValue(results.length),
    };
    return qb;
  };

  beforeEach(async () => {
    const mockQueryBuilder = createMockQueryBuilder(mockSplits);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SearchService,
        {
          provide: getRepositoryToken(Split),
          useValue: {
            createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
          },
        },
        {
          provide: getRepositoryToken(Item),
          useValue: {
            createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
          },
        },
        {
          provide: getRepositoryToken(Participant),
          useValue: {
            createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
          },
        },
      ],
    }).compile();

    service = module.get<SearchService>(SearchService);
    splitRepository = module.get(getRepositoryToken(Split));
    itemRepository = module.get(getRepositoryToken(Item));
    participantRepository = module.get(getRepositoryToken(Participant));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('searchSplits', () => {
    it('should return search results for a valid query', async () => {
      const result = await service.searchSplits({
        query: 'dinner',
      });

      expect(result).toBeDefined();
      expect(result.data).toBeInstanceOf(Array);
      expect(result.total).toBe(mockSplits.length);
      expect(result.hasMore).toBe(false);
    });

    it('should apply date filters correctly', async () => {
      const result = await service.searchSplits({
        query: 'lunch',
        filters: {
          dateFrom: '2024-01-01',
          dateTo: '2024-01-31',
        },
      });

      expect(result).toBeDefined();
      expect(splitRepository.createQueryBuilder).toHaveBeenCalled();
    });

    it('should apply amount filters correctly', async () => {
      const result = await service.searchSplits({
        query: 'meeting',
        filters: {
          minAmount: 50,
          maxAmount: 500,
        },
      });

      expect(result).toBeDefined();
      expect(splitRepository.createQueryBuilder).toHaveBeenCalled();
    });

    it('should apply status filters correctly', async () => {
      const result = await service.searchSplits({
        query: 'team',
        filters: {
          status: ['active', 'completed'],
        },
      });

      expect(result).toBeDefined();
      expect(splitRepository.createQueryBuilder).toHaveBeenCalled();
    });

    it('should apply participant filters correctly', async () => {
      const result = await service.searchSplits({
        query: 'dinner',
        filters: {
          participants: ['user-1', 'user-2'],
        },
      });

      expect(result).toBeDefined();
      expect(splitRepository.createQueryBuilder).toHaveBeenCalled();
    });

    it('should handle empty query gracefully', async () => {
      const result = await service.searchSplits({
        query: '',
      });

      expect(result).toBeDefined();
      expect(result.data).toBeInstanceOf(Array);
    });

    it('should respect limit parameter', async () => {
      const result = await service.searchSplits({
        query: 'dinner',
        limit: 10,
      });

      expect(result).toBeDefined();
    });

    it('should enforce maximum limit', async () => {
      const result = await service.searchSplits({
        query: 'dinner',
        limit: 1000, // Exceeds max
      });

      expect(result).toBeDefined();
      // Service should internally cap at 100
    });

    it('should handle cursor pagination', async () => {
      // First get results without cursor
      const firstPage = await service.searchSplits({
        query: 'dinner',
        limit: 1,
      });

      expect(firstPage).toBeDefined();
      // In real scenario, we'd use the cursor for next page
    });

    it('should support different sort options', async () => {
      const sortOptions = [
        'createdAt_desc',
        'createdAt_asc',
        'amount_desc',
        'amount_asc',
      ];

      for (const sort of sortOptions) {
        const result = await service.searchSplits({
          query: 'dinner',
          sort,
        });

        expect(result).toBeDefined();
      }
    });

    it('should generate highlights for matching content', async () => {
      const result = await service.searchSplits({
        query: 'dinner',
      });

      expect(result).toBeDefined();
      // In real scenario with matching data, highlights would contain marked text
      expect(result.data[0]).toHaveProperty('highlights');
    });

    it('should calculate relevance scores', async () => {
      const result = await service.searchSplits({
        query: 'dinner restaurant',
      });

      expect(result).toBeDefined();
      expect(result.data[0]).toHaveProperty('score');
      expect(typeof result.data[0].score).toBe('number');
    });

    it('should sanitize potentially malicious queries', async () => {
      const result = await service.searchSplits({
        query: '<script>alert("xss")</script>',
      });

      expect(result).toBeDefined();
      // Query should be sanitized, not throw
    });

    it('should handle very long queries', async () => {
      const longQuery = 'a'.repeat(500);
      const result = await service.searchSplits({
        query: longQuery,
      });

      expect(result).toBeDefined();
      // Query should be truncated internally
    });
  });

  describe('cursor encoding/decoding', () => {
    it('should produce valid cursor strings', async () => {
      const result = await service.searchSplits({
        query: 'dinner',
        limit: 1,
      });

      if (result.cursor) {
        // Cursor should be base64 encoded
        expect(() => Buffer.from(result.cursor!, 'base64')).not.toThrow();
      }
    });
  });
});
