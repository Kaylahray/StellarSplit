import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { Payment, PaymentStatus, StellarAsset } from './entities/payment.entity';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { UpdatePaymentDto } from './dto/update-payment.dto';

describe('PaymentsService', () => {
  let service: PaymentsService;
  let repository: Repository<Payment>;

  const mockPaymentRepository = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    remove: jest.fn(),
    count: jest.fn(),
  };

  const mockPayment: Payment = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    splitId: '123e4567-e89b-12d3-a456-426614174001',
    participantId: '123e4567-e89b-12d3-a456-426614174002',
    fromAddress: 'GDJXQYEWDPGYK4LGCLFEV6HBIW3M22IK6NN2WQONHP3ELH6HINIKBVY7',
    toAddress: 'GBVOL67TMUQBGL4TZYNMY3ZQ5WGQYFPFD5VJRWXR72VA33VFNL225PL5',
    amount: 100.5,
    asset: StellarAsset.XLM,
    stellarTxHash:
      'a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a7b8c9d0e1f2',
    status: PaymentStatus.PENDING,
    memo: 'Test payment',
    createdAt: new Date(),
    confirmedAt: null,
    split: null,
    participant: null,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentsService,
        {
          provide: getRepositoryToken(Payment),
          useValue: mockPaymentRepository,
        },
      ],
    }).compile();

    service = module.get<PaymentsService>(PaymentsService);
    repository = module.get<Repository<Payment>>(getRepositoryToken(Payment));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    const createPaymentDto: CreatePaymentDto = {
      splitId: '123e4567-e89b-12d3-a456-426614174001',
      participantId: '123e4567-e89b-12d3-a456-426614174002',
      fromAddress: 'GDJXQYEWDPGYK4LGCLFEV6HBIW3M22IK6NN2WQONHP3ELH6HINIKBVY7',
      toAddress: 'GBVOL67TMUQBGL4TZYNMY3ZQ5WGQYFPFD5VJRWXR72VA33VFNL225PL5',
      amount: 100.5,
      asset: StellarAsset.XLM,
      stellarTxHash:
        'a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a7b8c9d0e1f2',
      memo: 'Test payment',
    };

    it('should create a new payment', async () => {
      mockPaymentRepository.findOne.mockResolvedValue(null);
      mockPaymentRepository.create.mockReturnValue(mockPayment);
      mockPaymentRepository.save.mockResolvedValue(mockPayment);

      const result = await service.create(createPaymentDto);

      expect(result).toEqual(mockPayment);
      expect(mockPaymentRepository.findOne).toHaveBeenCalledWith({
        where: { stellarTxHash: createPaymentDto.stellarTxHash },
      });
      expect(mockPaymentRepository.create).toHaveBeenCalledWith(createPaymentDto);
      expect(mockPaymentRepository.save).toHaveBeenCalledWith(mockPayment);
    });

    it('should throw ConflictException if transaction hash already exists', async () => {
      mockPaymentRepository.findOne.mockResolvedValue(mockPayment);

      await expect(service.create(createPaymentDto)).rejects.toThrow(
        ConflictException,
      );
      expect(mockPaymentRepository.create).not.toHaveBeenCalled();
      expect(mockPaymentRepository.save).not.toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    it('should return all payments', async () => {
      const payments = [mockPayment];
      mockPaymentRepository.find.mockResolvedValue(payments);

      const result = await service.findAll();

      expect(result).toEqual(payments);
      expect(mockPaymentRepository.find).toHaveBeenCalledWith({
        where: {},
        relations: ['split', 'participant'],
        order: { createdAt: 'DESC' },
      });
    });

    it('should filter payments by splitId', async () => {
      const splitId = '123e4567-e89b-12d3-a456-426614174001';
      const payments = [mockPayment];
      mockPaymentRepository.find.mockResolvedValue(payments);

      const result = await service.findAll({ splitId });

      expect(result).toEqual(payments);
      expect(mockPaymentRepository.find).toHaveBeenCalledWith({
        where: { splitId },
        relations: ['split', 'participant'],
        order: { createdAt: 'DESC' },
      });
    });

    it('should filter payments by status', async () => {
      const status = PaymentStatus.CONFIRMED;
      const payments = [{ ...mockPayment, status }];
      mockPaymentRepository.find.mockResolvedValue(payments);

      const result = await service.findAll({ status });

      expect(result).toEqual(payments);
      expect(mockPaymentRepository.find).toHaveBeenCalledWith({
        where: { status },
        relations: ['split', 'participant'],
        order: { createdAt: 'DESC' },
      });
    });
  });

  describe('findBySplit', () => {
    it('should return payments for a specific split', async () => {
      const splitId = '123e4567-e89b-12d3-a456-426614174001';
      const payments = [mockPayment];
      mockPaymentRepository.find.mockResolvedValue(payments);

      const result = await service.findBySplit(splitId);

      expect(result).toEqual(payments);
      expect(mockPaymentRepository.find).toHaveBeenCalledWith({
        where: { splitId },
        relations: ['participant'],
        order: { createdAt: 'DESC' },
      });
    });
  });

  describe('findByParticipant', () => {
    it('should return payments for a specific participant', async () => {
      const participantId = '123e4567-e89b-12d3-a456-426614174002';
      const payments = [mockPayment];
      mockPaymentRepository.find.mockResolvedValue(payments);

      const result = await service.findByParticipant(participantId);

      expect(result).toEqual(payments);
      expect(mockPaymentRepository.find).toHaveBeenCalledWith({
        where: { participantId },
        relations: ['split'],
        order: { createdAt: 'DESC' },
      });
    });
  });

  describe('findOne', () => {
    it('should return a payment by ID', async () => {
      mockPaymentRepository.findOne.mockResolvedValue(mockPayment);

      const result = await service.findOne(mockPayment.id);

      expect(result).toEqual(mockPayment);
      expect(mockPaymentRepository.findOne).toHaveBeenCalledWith({
        where: { id: mockPayment.id },
        relations: ['split', 'participant'],
      });
    });

    it('should throw NotFoundException if payment not found', async () => {
      mockPaymentRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne('nonexistent-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('findByTxHash', () => {
    it('should return a payment by transaction hash', async () => {
      mockPaymentRepository.findOne.mockResolvedValue(mockPayment);

      const result = await service.findByTxHash(mockPayment.stellarTxHash);

      expect(result).toEqual(mockPayment);
      expect(mockPaymentRepository.findOne).toHaveBeenCalledWith({
        where: { stellarTxHash: mockPayment.stellarTxHash },
        relations: ['split', 'participant'],
      });
    });

    it('should throw NotFoundException if payment not found', async () => {
      mockPaymentRepository.findOne.mockResolvedValue(null);

      await expect(service.findByTxHash('nonexistent-hash')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    const updatePaymentDto: UpdatePaymentDto = {
      status: PaymentStatus.CONFIRMED,
    };

    it('should update a payment', async () => {
      mockPaymentRepository.findOne.mockResolvedValue(mockPayment);
      const updatedPayment = { ...mockPayment, ...updatePaymentDto };
      mockPaymentRepository.save.mockResolvedValue(updatedPayment);

      const result = await service.update(mockPayment.id, updatePaymentDto);

      expect(result.status).toEqual(PaymentStatus.CONFIRMED);
      expect(mockPaymentRepository.save).toHaveBeenCalled();
    });

    it('should auto-set confirmedAt when status changes to confirmed', async () => {
      mockPaymentRepository.findOne.mockResolvedValue(mockPayment);
      const updatedPayment = {
        ...mockPayment,
        status: PaymentStatus.CONFIRMED,
        confirmedAt: expect.any(Date),
      };
      mockPaymentRepository.save.mockResolvedValue(updatedPayment);

      const result = await service.update(mockPayment.id, {
        status: PaymentStatus.CONFIRMED,
      });

      expect(result.status).toEqual(PaymentStatus.CONFIRMED);
      expect(result.confirmedAt).toBeDefined();
    });

    it('should throw NotFoundException if payment not found', async () => {
      mockPaymentRepository.findOne.mockResolvedValue(null);

      await expect(
        service.update('nonexistent-id', updatePaymentDto),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('confirmPayment', () => {
    it('should confirm a payment', async () => {
      mockPaymentRepository.findOne.mockResolvedValue(mockPayment);
      const confirmedPayment = {
        ...mockPayment,
        status: PaymentStatus.CONFIRMED,
        confirmedAt: new Date(),
      };
      mockPaymentRepository.save.mockResolvedValue(confirmedPayment);

      const result = await service.confirmPayment(mockPayment.id);

      expect(result.status).toEqual(PaymentStatus.CONFIRMED);
      expect(result.confirmedAt).toBeDefined();
    });
  });

  describe('failPayment', () => {
    it('should mark a payment as failed', async () => {
      mockPaymentRepository.findOne.mockResolvedValue(mockPayment);
      const failedPayment = { ...mockPayment, status: PaymentStatus.FAILED };
      mockPaymentRepository.save.mockResolvedValue(failedPayment);

      const result = await service.failPayment(mockPayment.id);

      expect(result.status).toEqual(PaymentStatus.FAILED);
    });
  });

  describe('getSplitStats', () => {
    it('should return payment statistics for a split', async () => {
      const payments = [
        { ...mockPayment, status: PaymentStatus.PENDING, amount: 50 },
        { ...mockPayment, status: PaymentStatus.CONFIRMED, amount: 100 },
        { ...mockPayment, status: PaymentStatus.FAILED, amount: 25 },
      ];
      mockPaymentRepository.find.mockResolvedValue(payments);

      const result = await service.getSplitStats(mockPayment.splitId);

      expect(result).toEqual({
        total: 3,
        pending: 1,
        confirmed: 1,
        failed: 1,
        totalAmount: 100,
      });
    });
  });

  describe('getParticipantStats', () => {
    it('should return payment statistics for a participant', async () => {
      const payments = [
        { ...mockPayment, status: PaymentStatus.PENDING, amount: 50 },
        { ...mockPayment, status: PaymentStatus.CONFIRMED, amount: 75 },
        { ...mockPayment, status: PaymentStatus.CONFIRMED, amount: 25 },
      ];
      mockPaymentRepository.find.mockResolvedValue(payments);

      const result = await service.getParticipantStats(mockPayment.participantId);

      expect(result).toEqual({
        total: 3,
        pending: 1,
        confirmed: 2,
        failed: 0,
        totalAmount: 100,
      });
    });
  });

  describe('remove', () => {
    it('should delete a pending payment', async () => {
      mockPaymentRepository.findOne.mockResolvedValue(mockPayment);
      mockPaymentRepository.remove.mockResolvedValue(mockPayment);

      await service.remove(mockPayment.id);

      expect(mockPaymentRepository.remove).toHaveBeenCalledWith(mockPayment);
    });

    it('should throw BadRequestException when trying to delete confirmed payment', async () => {
      const confirmedPayment = {
        ...mockPayment,
        status: PaymentStatus.CONFIRMED,
      };
      mockPaymentRepository.findOne.mockResolvedValue(confirmedPayment);

      await expect(service.remove(mockPayment.id)).rejects.toThrow(
        BadRequestException,
      );
      expect(mockPaymentRepository.remove).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException if payment not found', async () => {
      mockPaymentRepository.findOne.mockResolvedValue(null);

      await expect(service.remove('nonexistent-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('countByStatus', () => {
    it('should count payments by status', async () => {
      mockPaymentRepository.count.mockResolvedValue(5);

      const result = await service.countByStatus(PaymentStatus.CONFIRMED);

      expect(result).toEqual(5);
      expect(mockPaymentRepository.count).toHaveBeenCalledWith({
        where: { status: PaymentStatus.CONFIRMED },
      });
    });
  });
});