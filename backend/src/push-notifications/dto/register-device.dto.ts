import { IsString, IsNotEmpty, IsEnum, IsOptional, IsBoolean } from 'class-validator';
import { DevicePlatform } from '../entities/device-registration.entity';

export class RegisterDeviceDto {
  @IsString()
  @IsNotEmpty()
  userId!: string;

  @IsString()
  @IsNotEmpty()
  deviceToken!: string;

  @IsEnum(DevicePlatform)
  @IsNotEmpty()
  platform!: DevicePlatform;

  @IsString()
  @IsOptional()
  deviceName?: string;
}
