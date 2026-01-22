import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotFoundException } from '@nestjs/common';
import { ParticipantsService } from './participants.service';
import { Participant, PaymentStatus } from './entities/participant.entity';
import { Split } from '../splits/entities/split.entity';

describe('ParticipantsService', () => {
  let service: ParticipantsService;
  let participantRepository: Repository<Participant>;
  let splitRepository: Repository<Split>;

  const mockSplit = {
    id: '550e8400-e29b-41d4-a716-446655440000',
    title: 'Test Split',
    totalAmount: 100,
    participants: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockParticipant = {
    id: 'participant-uuid',
    splitId: mockSplit.id,
    name: 'John Doe',
    walletAddress: 'GDZST3XVCDTUJ76ZAV2HA72KYQODXXZ5PTMAPZGDHZ6CS7RO7MGG3DBM',
    email: 'john@example.com',
    amountOwed: 50,
    amountPaid: 0,
    paymentStatus: PaymentStatus.PENDING,
    paymentTxHash: null,
    notificationSent: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ParticipantsService,
        {
          provide: getRepositoryToken(Participant),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            find: jest.fn(),
            findOne: jest.fn(),
            remove: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Split),
          useValue: {
            findOne: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<ParticipantsService>(ParticipantsService);
    participantRepository = module.get<Repository<Participant>>(
      getRepositoryToken(Participant),
    );
    splitRepository = module.get<Repository<Split>>(getRepositoryToken(Split));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a participant with pending status', async () => {
      const createDto = {
        splitId: mockSplit.id,
        name: 'John Doe',
        walletAddress: 'GDZST3XVCDTUJ76ZAV2HA72KYQODXXZ5PTMAPZGDHZ6CS7RO7MGG3DBM',
        amountOwed: 50,
      };

      jest.spyOn(splitRepository, 'findOne').mockResolvedValue(mockSplit as any);
      jest.spyOn(participantRepository, 'create').mockReturnValue(mockParticipant as any);
      jest.spyOn(participantRepository, 'save').mockResolvedValue(mockParticipant as any);

      const result = await service.create(createDto);

      expect(splitRepository.findOne).toHaveBeenCalledWith({
        where: { id: createDto.splitId },
      });
      expect(result.paymentStatus).toBe(PaymentStatus.PENDING);
    });

    it('should throw NotFoundException when split does not exist', async () => {
      const createDto = {
        splitId: 'invalid-split-id',
        name: 'John Doe',
        walletAddress: 'GDZST3XVCDTUJ76ZAV2HA72KYQODXXZ5PTMAPZGDHZ6CS7RO7MGG3DBM',
        amountOwed: 50,
      };

      jest.spyOn(splitRepository, 'findOne').mockResolvedValue(null);

      await expect(service.create(createDto)).rejects.toThrow(NotFoundException);
    });

    it('should set payment status to paid when amountPaid equals amountOwed', async () => {
      const createDto = {
        splitId: mockSplit.id,
        name: 'John Doe',
        walletAddress: 'GDZST3XVCDTUJ76ZAV2HA72KYQODXXZ5PTMAPZGDHZ6CS7RO7MGG3DBM',
        amountOwed: 50,
        amountPaid: 50,
      };

      const paidParticipant = { ...mockParticipant, amountPaid: 50, paymentStatus: PaymentStatus.PAID };

      jest.spyOn(splitRepository, 'findOne').mockResolvedValue(mockSplit as any);
      jest.spyOn(participantRepository, 'create').mockReturnValue(paidParticipant as any);
      jest.spyOn(participantRepository, 'save').mockResolvedValue(paidParticipant as any);

      const result = await service.create(createDto);

      expect(result.paymentStatus).toBe(PaymentStatus.PAID);
    });

    it('should set payment status to partial when amountPaid is between 0 and amountOwed', async () => {
      const createDto = {
        splitId: mockSplit.id,
        name: 'John Doe',
        walletAddress: 'GDZST3XVCDTUJ76ZAV2HA72KYQODXXZ5PTMAPZGDHZ6CS7RO7MGG3DBM',
        amountOwed: 50,
        amountPaid: 25,
      };

      const partialParticipant = { ...mockParticipant, amountPaid: 25, paymentStatus: PaymentStatus.PARTIAL };

      jest.spyOn(splitRepository, 'findOne').mockResolvedValue(mockSplit as any);
      jest.spyOn(participantRepository, 'create').mockReturnValue(partialParticipant as any);
      jest.spyOn(participantRepository, 'save').mockResolvedValue(partialParticipant as any);

      const result = await service.create(createDto);

      expect(result.paymentStatus).toBe(PaymentStatus.PARTIAL);
    });
  });

  describe('findAll', () => {
    it('should return an array of participants', async () => {
      const participants = [mockParticipant];
      jest.spyOn(participantRepository, 'find').mockResolvedValue(participants as any);

      const result = await service.findAll();

      expect(result).toEqual(participants);
      expect(participantRepository.find).toHaveBeenCalledWith({
        relations: ['split'],
      });
    });
  });

  describe('findOne', () => {
    it('should return a participant by id', async () => {
      jest.spyOn(participantRepository, 'findOne').mockResolvedValue(mockParticipant as any);

      const result = await service.findOne('participant-uuid');

      expect(result).toEqual(mockParticipant);
      expect(participantRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'participant-uuid' },
        relations: ['split'],
      });
    });

    it('should throw NotFoundException when participant not found', async () => {
      jest.spyOn(participantRepository, 'findOne').mockResolvedValue(null);

      await expect(service.findOne('invalid-id')).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should update a participant', async () => {
      const updateDto = { name: 'Jane Doe' };
      const updatedParticipant = { ...mockParticipant, name: 'Jane Doe' };

      jest.spyOn(participantRepository, 'findOne').mockResolvedValue(mockParticipant as any);
      jest.spyOn(participantRepository, 'save').mockResolvedValue(updatedParticipant as any);

      const result = await service.update('participant-uuid', updateDto);

      expect(result.name).toBe('Jane Doe');
    });

    it('should recalculate payment status when amountPaid is updated', async () => {
      const updateDto = { amountPaid: 50 };
      const updatedParticipant = { ...mockParticipant, amountPaid: 50, paymentStatus: PaymentStatus.PAID };

      jest.spyOn(participantRepository, 'findOne').mockResolvedValue(mockParticipant as any);
      jest.spyOn(participantRepository, 'save').mockResolvedValue(updatedParticipant as any);

      const result = await service.update('participant-uuid', updateDto);

      expect(result.paymentStatus).toBe(PaymentStatus.PAID);
    });
  });

  describe('remove', () => {
    it('should remove a participant', async () => {
      jest.spyOn(participantRepository, 'findOne').mockResolvedValue(mockParticipant as any);
      jest.spyOn(participantRepository, 'remove').mockResolvedValue(mockParticipant as any);

      await service.remove('participant-uuid');

      expect(participantRepository.remove).toHaveBeenCalledWith(mockParticipant);
    });

    it('should throw NotFoundException when participant does not exist', async () => {
      jest.spyOn(participantRepository, 'findOne').mockResolvedValue(null);

      await expect(service.remove('invalid-id')).rejects.toThrow(NotFoundException);
    });
  });
});
