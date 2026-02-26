import { Test, TestingModule } from '@nestjs/testing';
import { SplitHistoryService } from './split-history.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { SplitHistory, SplitRole } from './entities/split-history.entity';
import { SplitArchive, ArchiveReason } from '../modules/archiving/entities/split-archive.entity';
import { Repository } from 'typeorm';

describe('SplitHistoryService', () => {
  let service: SplitHistoryService;
  let historyRepo: Repository<SplitHistory>;
  let archiveRepo: Repository<SplitArchive>;

  const mockHistoryRepo = {
    find: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  const mockArchiveRepo = {
    createQueryBuilder: jest.fn(() => ({
      where: jest.fn().mockReturnThis(),
      orWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([]),
    })),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SplitHistoryService,
        { provide: getRepositoryToken(SplitHistory), useValue: mockHistoryRepo },
        { provide: getRepositoryToken(SplitArchive), useValue: mockArchiveRepo },
      ],
    }).compile();

    service = module.get<SplitHistoryService>(SplitHistoryService);
    historyRepo = module.get<Repository<SplitHistory>>(getRepositoryToken(SplitHistory));
    archiveRepo = module.get<Repository<SplitArchive>>(getRepositoryToken(SplitArchive));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getUserHistory', () => {
    it('should return combined history from active and archived splits', async () => {
      console.log('RUNNING TEST getUserHistory');
      const wallet = 'user-wallet-1';
      
      const activeHistory = [
        {
          id: 'hist-1',
          userId: wallet,
          splitId: 'split-1',
          role: SplitRole.PARTICIPANT,
          finalAmount: '-50',
          completionTime: new Date('2023-01-02'),
          split: { id: 'split-1', status: 'completed' },
        }
      ];

      const archivedSplits = [
        {
          id: 'archive-1',
          originalSplitId: 'split-2',
          splitData: {
            id: 'split-2',
            totalAmount: 100,
            creatorWalletAddress: 'other-wallet',
          },
          participantData: [
            { userId: 'u-1', walletAddress: wallet, amountOwed: 50, amountPaid: 0 }
          ],
          archiveReason: ArchiveReason.EXPIRED,
          archivedAt: new Date('2023-01-01'),
        }
      ];

      mockHistoryRepo.find.mockResolvedValue(activeHistory);
      
      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        orWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(archivedSplits),
      };
      
      mockArchiveRepo.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      const result = await service.getUserHistory(wallet);

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('hist-1'); // Newer date
      expect(result[1].id).toBe('archive-1'); // Older date
      expect(result[1]).toHaveProperty('isArchived', true);
      expect(result[1].finalAmount).toBe('-50');
    });
  });

  describe('getUserStats', () => {
    it('should return combined stats', async () => {
      const wallet = 'user-wallet-1';
      
      const qbMock = {
        clone: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        innerJoin: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
         limit: jest.fn().mockReturnThis(),
         getCount: jest.fn().mockResolvedValue(4), // Return 4 for both created and participated
         getRawOne: jest.fn()
             .mockResolvedValueOnce({ avg: 20 }) // avg
             .mockResolvedValueOnce({ total: 100 }), // total
         getRawMany: jest.fn().mockResolvedValue([
            { partner: 'p1', count: '2' }
        ]),
      };
      
      mockHistoryRepo.createQueryBuilder.mockReturnValue(qbMock);

      const archivedSplits = [
        {
          id: 'archive-1',
          splitData: {
            id: 'split-2',
            totalAmount: 50,
            creatorWalletAddress: wallet, // Created by user
          },
          participantData: [],
        },
        {
            id: 'archive-2',
            splitData: {
              id: 'split-3',
              totalAmount: 40,
              creatorWalletAddress: 'other',
            },
            participantData: [{ walletAddress: wallet, amountOwed: 20 }], // Participated
        }
      ];

      const archiveQbMock = {
        where: jest.fn().mockReturnThis(),
        orWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(archivedSplits),
      };
      
      mockArchiveRepo.createQueryBuilder.mockReturnValue(archiveQbMock);

      const result = await service.getUserStats(wallet);

      // Active: 4 created, 4 participated. Total 8. Total Amount 100.
       // Archived: 1 created (50), 1 participated (-20).
       // Total Created: 4 + 1 = 5
       // Total Participated: 4 + 1 = 5
       // Total Amount: 100 + 50 - 20 = 130
       // Total Count: 8 + 2 = 10
       // Avg: 130 / 10 = 13
       
       expect(result.totalSplitsCreated).toBe(5);
       expect(result.totalSplitsParticipated).toBe(5);
       expect(result.totalAmount).toBe(130);
       expect(result.averageSplitAmount).toBe(13);
    });
  });
});
