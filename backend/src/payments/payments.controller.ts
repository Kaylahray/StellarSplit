import { Controller, Post, Get, Body, Param, Logger, ValidationPipe } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { SubmitPaymentDto } from './dto/submit-payment.dto';

@Controller('payments')
export class PaymentsController {
  private readonly logger = new Logger(PaymentsController.name);

  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('/submit')
  async submitPayment(@Body(ValidationPipe) submitPaymentDto: SubmitPaymentDto) {
    this.logger.log(`Received payment submission: ${JSON.stringify(submitPaymentDto)}`);
    
    const { splitId, participantId, stellarTxHash } = submitPaymentDto;
    return await this.paymentsService.submitPayment(splitId, participantId, stellarTxHash);
  }

  @Get('/verify/:txHash')
  async verifyTransaction(@Param('txHash') txHash: string) {
    this.logger.log(`Verifying transaction: ${txHash}`);
    
    return await this.paymentsService.verifyTransaction(txHash);
  }

  @Get('/:txHash')
  async getPaymentByTxHash(@Param('txHash') txHash: string) {
    this.logger.log(`Getting payment for transaction: ${txHash}`);
    
    return await this.paymentsService.getPaymentByTxHash(txHash);
  }

  @Get('/split/:splitId')
  async getPaymentsBySplitId(@Param('splitId') splitId: string) {
    this.logger.log(`Getting payments for split: ${splitId}`);
    
    return await this.paymentsService.getPaymentsBySplitId(splitId);
  }

  @Get('/participant/:participantId')
  async getPaymentsByParticipantId(@Param('participantId') participantId: string) {
    this.logger.log(`Getting payments for participant: ${participantId}`);
    
    return await this.paymentsService.getPaymentsByParticipantId(participantId);
  }

  @Get('/stats/:splitId')
  async getPaymentStatsForSplit(@Param('splitId') splitId: string) {
    this.logger.log(`Getting payment stats for split: ${splitId}`);
    
    return await this.paymentsService.getPaymentStatsForSplit(splitId);
  }
}