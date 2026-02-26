import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { getQueueToken } from '@nestjs/bull';
import { Repository } from 'typeorm';
import { PushNotificationsService } from './push-notifications.service';
import { DeviceRegistration, DevicePlatform } from './entities/device-registration.entity';
import { NotificationPreference, NotificationEventType } from './entities/notification-preference.entity';

describe('PushNotificationsService', () => {
  let service: PushNotificationsService;
  let deviceRepo: Repository<DeviceRegistration>;
  let prefRepo: Repository<NotificationPreference>;
  let pushQueue: any;

  const mockDeviceRepo = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn(),
    delete: jest.fn(),
  };

  const mockPrefRepo = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn(),
  };

  const mockPushQueue = {
    add: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PushNotificationsService,
        {
          provide: getRepositoryToken(DeviceRegistration),
          useValue: mockDeviceRepo,
        },
        {
          provide: getRepositoryToken(NotificationPreference),
          useValue: mockPrefRepo,
        },
        {
          provide: getQueueToken('push_queue'),
          useValue: mockPushQueue,
        },
      ],
    }).compile();

    service = module.get<PushNotificationsService>(PushNotificationsService);
    deviceRepo = module.get<Repository<DeviceRegistration>>(getRepositoryToken(DeviceRegistration));
    prefRepo = module.get<Repository<NotificationPreference>>(getRepositoryToken(NotificationPreference));
    pushQueue = module.get(getQueueToken('push_queue'));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('registerDevice', () => {
    it('should create a new device if not exists', async () => {
      const dto = {
        userId: 'user1',
        deviceToken: 'token123',
        platform: DevicePlatform.ANDROID,
        deviceName: 'Pixel 6',
      };

      mockDeviceRepo.findOne.mockResolvedValue(null);
      mockDeviceRepo.create.mockReturnValue(dto);
      mockDeviceRepo.save.mockResolvedValue({ ...dto, id: 'uuid' });

      const result = await service.registerDevice(dto);

      expect(mockDeviceRepo.findOne).toHaveBeenCalledWith({ where: { deviceToken: dto.deviceToken } });
      expect(mockDeviceRepo.create).toHaveBeenCalledWith(dto);
      expect(mockDeviceRepo.save).toHaveBeenCalled();
      expect(result).toEqual({ ...dto, id: 'uuid' });
    });

    it('should update existing device', async () => {
      const dto = {
        userId: 'user1',
        deviceToken: 'token123',
        platform: DevicePlatform.IOS,
      };

      const existingDevice = {
        id: 'uuid',
        userId: 'oldUser',
        deviceToken: 'token123',
        platform: DevicePlatform.ANDROID,
        isActive: false,
      };

      mockDeviceRepo.findOne.mockResolvedValue(existingDevice);
      mockDeviceRepo.save.mockResolvedValue({ ...existingDevice, userId: dto.userId, platform: dto.platform, isActive: true });

      await service.registerDevice(dto);

      expect(mockDeviceRepo.create).not.toHaveBeenCalled();
      expect(existingDevice.userId).toBe(dto.userId);
      expect(existingDevice.isActive).toBe(true);
      expect(mockDeviceRepo.save).toHaveBeenCalledWith(existingDevice);
    });
  });

  describe('updatePreferences', () => {
    it('should update preferences', async () => {
      const dto = {
        userId: 'user1',
        preferences: [
          {
            eventType: NotificationEventType.SPLIT_CREATED,
            pushEnabled: false,
          },
        ],
      };

      const existingPref = {
        id: 'uuid',
        userId: 'user1',
        eventType: NotificationEventType.SPLIT_CREATED,
        pushEnabled: true,
      };

      mockPrefRepo.findOne.mockResolvedValue(existingPref);
      mockPrefRepo.save.mockResolvedValue({ ...existingPref, pushEnabled: false });

      await service.updatePreferences(dto);

      expect(existingPref.pushEnabled).toBe(false);
      expect(mockPrefRepo.save).toHaveBeenCalledWith(existingPref);
    });

    it('should create preference if not exists', async () => {
        const dto = {
          userId: 'user1',
          preferences: [
            {
              eventType: NotificationEventType.SPLIT_CREATED,
              pushEnabled: false,
            },
          ],
        };
  
        mockPrefRepo.findOne.mockResolvedValue(null);
        mockPrefRepo.create.mockReturnValue({ 
            userId: 'user1', 
            eventType: NotificationEventType.SPLIT_CREATED 
        });
        mockPrefRepo.save.mockResolvedValue({ 
            userId: 'user1', 
            eventType: NotificationEventType.SPLIT_CREATED,
            pushEnabled: false 
        });
  
        await service.updatePreferences(dto);
  
        expect(mockPrefRepo.create).toHaveBeenCalled();
        expect(mockPrefRepo.save).toHaveBeenCalled();
      });
  });

  describe('sendNotification', () => {
    it('should queue a notification job', async () => {
        await service.sendNotification('user1', NotificationEventType.SPLIT_CREATED, 'Title', 'Body', { key: 'value' });
        
        expect(mockPushQueue.add).toHaveBeenCalledWith('sendPush', {
            userId: 'user1',
            eventType: NotificationEventType.SPLIT_CREATED,
            title: 'Title',
            body: 'Body',
            data: { key: 'value' },
        });
    });
  });
});
