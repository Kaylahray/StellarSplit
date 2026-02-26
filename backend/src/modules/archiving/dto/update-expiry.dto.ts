import { IsDateString, IsNotEmpty } from 'class-validator';

export class UpdateExpiryDto {
  @IsDateString()
  @IsNotEmpty()
  expiryDate!: string;
}
