import {
  IsString,
  IsNotEmpty,
  IsEmail,
  IsOptional,
  IsNumber,
  IsEnum,
  IsUUID,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { PaymentStatus } from '../entities/participant.entity';
import { IsStellarAddress } from '../validators/stellar-address.validator';

export class CreateParticipantDto {
  @ApiProperty({
    description: 'UUID of the split this participant belongs to',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsUUID()
  @IsNotEmpty()
  splitId: string;

  @ApiProperty({
    description: 'Name of the participant',
    example: 'John Doe',
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    description: 'Stellar wallet address',
    example: 'GDZST3XVCDTUJ76ZAV2HA72KYQODXXZ5PTMAPZGDHZ6CS7RO7MGG3DBM',
  })
  @IsString()
  @IsNotEmpty()
  @IsStellarAddress()
  walletAddress: string;

  @ApiPropertyOptional({
    description: 'Email address of the participant',
    example: 'john.doe@example.com',
  })
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiProperty({
    description: 'Amount owed by the participant',
    example: 50.00,
  })
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  amountOwed: number;

  @ApiPropertyOptional({
    description: 'Amount already paid by the participant',
    example: 0,
    default: 0,
  })
  @IsNumber()
  @Min(0)
  @IsOptional()
  @Type(() => Number)
  amountPaid?: number;

  @ApiPropertyOptional({
    description: 'Payment status',
    enum: PaymentStatus,
    default: PaymentStatus.PENDING,
  })
  @IsEnum(PaymentStatus)
  @IsOptional()
  paymentStatus?: PaymentStatus;

  @ApiPropertyOptional({
    description: 'Stellar transaction hash for payment',
    example: 'a3c5f...',
  })
  @IsString()
  @IsOptional()
  paymentTxHash?: string;

  @ApiPropertyOptional({
    description: 'Whether notification has been sent',
    default: false,
  })
  @IsOptional()
  notificationSent?: boolean;
}
