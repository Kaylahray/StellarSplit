import { Module, HttpModule } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserCurrencyPreference } from './entities/user-currency-preference.entity';
import { CurrencyRateCache } from './entities/currency-rate-cache.entity';
import { UserCurrencyService } from './user-currency.service';
import { UserCurrencyController } from './user-currency.controller';
import { GeoModule } from './geo/geo.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([UserCurrencyPreference, CurrencyRateCache]),
    GeoModule,
    HttpModule,
  ],
  providers: [UserCurrencyService],
  controllers: [UserCurrencyController],
  exports: [UserCurrencyService],
})
export class UserCurrencyModule {}