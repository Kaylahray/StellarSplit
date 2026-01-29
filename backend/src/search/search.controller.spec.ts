import { Test, TestingModule } from '@nestjs/testing';
import { SearchController } from './search.controller';
import { SearchService } from './search.service';
import { SearchResultDto } from './dto/search-result.dto';

/**
 * Unit tests for SearchController
 * Testing endpoint behavior with mocked service
 */
describe('SearchController', () => {
  let controller: SearchController;
  let searchService: jest.Mocked<SearchService>;

  const mockSearchResult: SearchResultDto = {
    data: [
      {
        split: {
          id: 'split-1',
          totalAmount: 100,
          amountPaid: 50,
          status: 'active',
          description: 'Test split',
          createdAt: new Date(),
          updatedAt: new Date(),
          participants: [],
        },
        highlights: {
          description: 'Test <mark>split</mark>',
        },
        score: 0.8,
      },
    ],
    total: 1,
    cursor: null,
    hasMore: false,
  };

  beforeEach(async () => {
    const mockSearchService = {
      searchSplits: jest.fn().mockResolvedValue(mockSearchResult),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [SearchController],
      providers: [
        {
          provide: SearchService,
          useValue: mockSearchService,
        },
      ],
    }).compile();

    controller = module.get<SearchController>(SearchController);
    searchService = module.get(SearchService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('searchSplits', () => {
    it('should call searchService.searchSplits with correct parameters', async () => {
      const searchDto = {
        query: 'dinner',
        filters: {
          status: ['active'],
        },
        limit: 20,
      };

      await controller.searchSplits(searchDto);

      expect(searchService.searchSplits).toHaveBeenCalledWith(searchDto);
    });

    it('should return search results from service', async () => {
      const result = await controller.searchSplits({ query: 'dinner' });

      expect(result).toEqual(mockSearchResult);
    });

    it('should handle empty query', async () => {
      const result = await controller.searchSplits({ query: '' });

      expect(searchService.searchSplits).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it('should pass all filter options correctly', async () => {
      const searchDto = {
        query: 'meeting',
        filters: {
          dateFrom: '2024-01-01',
          dateTo: '2024-12-31',
          minAmount: 10,
          maxAmount: 1000,
          status: ['active', 'completed'],
          participants: ['user-1', 'user-2'],
        },
        sort: 'createdAt_desc',
        limit: 50,
        cursor: 'abc123',
      };

      await controller.searchSplits(searchDto);

      expect(searchService.searchSplits).toHaveBeenCalledWith(searchDto);
    });

    it('should handle service errors gracefully', async () => {
      searchService.searchSplits.mockRejectedValueOnce(new Error('Database error'));

      await expect(controller.searchSplits({ query: 'test' }))
        .rejects
        .toThrow('Database error');
    });
  });
});
