import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { PaymentProcessorService } from './payment-processor.service';
import { StellarModule } from '../stellar/stellar.module';
import { PaymentGateway } from '../websocket/payment.gateway';
import { Payment } from '../entities/payment.entity';
import { Participant } from '../entities/participant.entity';
import { Split } from '../entities/split.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Payment, Participant, Split]),
    StellarModule,
  ],
  controllers: [PaymentsController],
  providers: [PaymentsService, PaymentProcessorService, PaymentGateway],
  exports: [PaymentsService, PaymentProcessorService],
})
export class PaymentsModule {}