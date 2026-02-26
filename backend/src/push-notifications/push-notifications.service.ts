import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { DeviceRegistration } from './entities/device-registration.entity';
import { NotificationPreference, NotificationEventType } from './entities/notification-preference.entity';
import { RegisterDeviceDto } from './dto/register-device.dto';
import { UpdatePreferencesDto } from './dto/update-preferences.dto';

@Injectable()
export class PushNotificationsService {
  private readonly logger = new Logger(PushNotificationsService.name);

  constructor(
    @InjectRepository(DeviceRegistration)
    private deviceRepo: Repository<DeviceRegistration>,
    @InjectRepository(NotificationPreference)
    private prefRepo: Repository<NotificationPreference>,
    @InjectQueue('push_queue') private pushQueue: Queue,
  ) {}

  async registerDevice(dto: RegisterDeviceDto): Promise<DeviceRegistration> {
    let device = await this.deviceRepo.findOne({
      where: { deviceToken: dto.deviceToken },
    });

    if (device) {
      device.userId = dto.userId;
      device.lastSeenAt = new Date();
      device.isActive = true;
      if (dto.deviceName) device.deviceName = dto.deviceName;
    } else {
      device = this.deviceRepo.create({
        userId: dto.userId,
        deviceToken: dto.deviceToken,
        platform: dto.platform,
        deviceName: dto.deviceName,
      });
    }

    return this.deviceRepo.save(device);
  }

  async unregisterDevice(deviceId: string): Promise<void> {
    await this.deviceRepo.delete(deviceId);
  }

  async getDevices(userId: string): Promise<DeviceRegistration[]> {
    return this.deviceRepo.find({ where: { userId, isActive: true } });
  }

  async updatePreferences(dto: UpdatePreferencesDto): Promise<NotificationPreference[]> {
    const results: NotificationPreference[] = [];

    for (const prefDto of dto.preferences) {
      let pref = await this.prefRepo.findOne({
        where: { userId: dto.userId, eventType: prefDto.eventType },
      });

      if (!pref) {
        pref = this.prefRepo.create({
          userId: dto.userId,
          eventType: prefDto.eventType,
        });
      }

      if (prefDto.pushEnabled !== undefined) pref.pushEnabled = prefDto.pushEnabled;
      if (prefDto.emailEnabled !== undefined) pref.emailEnabled = prefDto.emailEnabled;
      if (prefDto.quietHoursStart !== undefined) pref.quietHoursStart = prefDto.quietHoursStart;
      if (prefDto.quietHoursEnd !== undefined) pref.quietHoursEnd = prefDto.quietHoursEnd;
      if (prefDto.timezone !== undefined) pref.timezone = prefDto.timezone;

      results.push(await this.prefRepo.save(pref));
    }

    return results;
  }

  async getPreferences(userId: string): Promise<NotificationPreference[]> {
    return this.prefRepo.find({ where: { userId } });
  }

  async sendNotification(
    userId: string,
    eventType: NotificationEventType,
    title: string,
    body: string,
    data?: Record<string, string>,
  ): Promise<void> {
    await this.pushQueue.add('sendPush', {
      userId,
      eventType,
      title,
      body,
      data,
    });
    this.logger.log(`Queued push notification for user ${userId} event ${eventType}`);
  }

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async cleanupStaleTokens() {
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const result = await this.deviceRepo.delete({
        lastSeenAt: LessThan(sixMonthsAgo),
    });
    
    this.logger.log(`Cleaned up ${result.affected} stale device tokens`);
  }
}
