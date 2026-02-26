import { Controller, Post, Body, Delete, Param, Get, Put, Req, Logger, UseGuards } from '@nestjs/common';
import { PushNotificationsService } from './push-notifications.service';
import { RegisterDeviceDto } from './dto/register-device.dto';
import { UpdatePreferencesDto } from './dto/update-preferences.dto';
import { NotificationEventType } from './entities/notification-preference.entity';

// Assuming there's an AuthGuard available globally or I should add it.
// Given the other controller example, there's no explicit @UseGuards on the controller class, 
// maybe it's global or I missed it. But req.user is accessed.

@Controller('push')
export class PushNotificationsController {
  private readonly logger = new Logger(PushNotificationsController.name);

  constructor(private readonly pushService: PushNotificationsService) {}

  @Post('register-device')
  async registerDevice(@Body() dto: RegisterDeviceDto, @Req() req: any) {
    // If authenticated, use the wallet address from the token
    if (req.user && req.user.walletAddress) {
        dto.userId = req.user.walletAddress;
    }
    return this.pushService.registerDevice(dto);
  }

  @Delete('unregister-device/:deviceId')
  async unregisterDevice(@Param('deviceId') deviceId: string) {
    return this.pushService.unregisterDevice(deviceId);
  }

  @Get('devices')
  async getDevices(@Req() req: any) {
    const userId = req.user?.walletAddress || req.query?.userId;
    if (!userId) {
        // Return 400 or empty list
        return [];
    }
    return this.pushService.getDevices(userId);
  }

  @Put('preferences')
  async updatePreferences(@Body() dto: UpdatePreferencesDto, @Req() req: any) {
    if (req.user && req.user.walletAddress) {
        dto.userId = req.user.walletAddress;
    }
    return this.pushService.updatePreferences(dto);
  }

  @Get('preferences')
  async getPreferences(@Req() req: any) {
    const userId = req.user?.walletAddress || req.query.userId;
    if (!userId) {
        return [];
    }
    return this.pushService.getPreferences(userId);
  }

  @Post('test')
  async sendTestNotification(@Body() body: { userId: string, title?: string, message?: string }) {
    const { userId, title, message } = body;
    await this.pushService.sendNotification(
        userId, 
        NotificationEventType.SPLIT_CREATED, // Just a test event type
        title || 'Test Notification', 
        message || 'This is a test notification from StellarSplit'
    );
    return { success: true };
  }
}
