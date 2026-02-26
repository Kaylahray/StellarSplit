import { IsString, IsNotEmpty, IsEnum, IsBoolean, IsOptional, Matches, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { NotificationEventType } from '../entities/notification-preference.entity';

export class PreferenceItemDto {
  @IsEnum(NotificationEventType)
  @IsNotEmpty()
  eventType!: NotificationEventType;

  @IsBoolean()
  @IsOptional()
  pushEnabled?: boolean;

  @IsBoolean()
  @IsOptional()
  emailEnabled?: boolean;

  @IsString()
  @IsOptional()
  @Matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, { message: 'Time must be in HH:MM format' })
  quietHoursStart?: string;

  @IsString()
  @IsOptional()
  @Matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, { message: 'Time must be in HH:MM format' })
  quietHoursEnd?: string;

  @IsString()
  @IsOptional()
  timezone?: string;
}

export class UpdatePreferencesDto {
  @IsString()
  @IsNotEmpty()
  userId!: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PreferenceItemDto)
  preferences!: PreferenceItemDto[];
}
