import { Test, TestingModule } from '@nestjs/testing';
import { ParticipantsController } from './participants.controller';
import { ParticipantsService } from './participants.service';
import { PaymentStatus } from './entities/participant.entity';
import { NotFoundException } from '@nestjs/common';

describe('ParticipantsController', () => {
  let controller: ParticipantsController;
  let service: ParticipantsService;

  const mockParticipant = {
    id: 'participant-uuid',
    splitId: 'split-uuid',
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

  const mockService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ParticipantsController],
      providers: [
        {
          provide: ParticipantsService,
          useValue: mockService,
        },
      ],
    }).compile();

    controller = module.get<ParticipantsController>(ParticipantsController);
    service = module.get<ParticipantsService>(ParticipantsService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should create a new participant', async () => {
      const createDto = {
        splitId: 'split-uuid',
        name: 'John Doe',
        walletAddress: 'GDZST3XVCDTUJ76ZAV2HA72KYQODXXZ5PTMAPZGDHZ6CS7RO7MGG3DBM',
        amountOwed: 50,
      };

      mockService.create.mockResolvedValue(mockParticipant);

      const result = await controller.create(createDto);

      expect(result).toEqual(mockParticipant);
      expect(service.create).toHaveBeenCalledWith(createDto);
    });
  });

  describe('findAll', () => {
    it('should return an array of participants', async () => {
      const participants = [mockParticipant];
      mockService.findAll.mockResolvedValue(participants);

      const result = await controller.findAll();

      expect(result).toEqual(participants);
      expect(service.findAll).toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('should return a participant by id', async () => {
      mockService.findOne.mockResolvedValue(mockParticipant);

      const result = await controller.findOne('participant-uuid');

      expect(result).toEqual(mockParticipant);
      expect(service.findOne).toHaveBeenCalledWith('participant-uuid');
    });

    it('should throw NotFoundException when participant not found', async () => {
      mockService.findOne.mockRejectedValue(new NotFoundException());

      await expect(controller.findOne('invalid-id')).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should update a participant', async () => {
      const updateDto = { name: 'Jane Doe' };
      const updatedParticipant = { ...mockParticipant, name: 'Jane Doe' };

      mockService.update.mockResolvedValue(updatedParticipant);

      const result = await controller.update('participant-uuid', updateDto);

      expect(result).toEqual(updatedParticipant);
      expect(service.update).toHaveBeenCalledWith('participant-uuid', updateDto);
    });
  });

  describe('remove', () => {
    it('should remove a participant', async () => {
      mockService.remove.mockResolvedValue(undefined);

      await controller.remove('participant-uuid');

      expect(service.remove).toHaveBeenCalledWith('participant-uuid');
    });
  });
});
