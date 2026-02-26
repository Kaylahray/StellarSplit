import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { BullModule } from '@nestjs/bull';
import { PushNotificationsService } from './push-notifications.service';
import { PushNotificationsController } from './push-notifications.controller';
import { PushNotificationProcessor } from './push-notifications.processor';
import { DeviceRegistration } from './entities/device-registration.entity';
import { NotificationPreference } from './entities/notification-preference.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([DeviceRegistration, NotificationPreference]),
    ScheduleModule.forRoot(),
    BullModule.registerQueue({
      name: 'push_queue',
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 1000,
        },
        removeOnComplete: true,
      },
    }),
  ],
  controllers: [PushNotificationsController],
  providers: [PushNotificationsService, PushNotificationProcessor],
  exports: [PushNotificationsService],
})
export class PushNotificationsModule {}
