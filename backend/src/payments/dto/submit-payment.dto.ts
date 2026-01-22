import { IsString, IsUUID, IsNotEmpty } from 'class-validator';

export class SubmitPaymentDto {
  @IsUUID()
  @IsNotEmpty()
  splitId!: string;

  @IsUUID()
  @IsNotEmpty()
  participantId!: string;

  @IsString()
  @IsNotEmpty()
  stellarTxHash!: string;
}