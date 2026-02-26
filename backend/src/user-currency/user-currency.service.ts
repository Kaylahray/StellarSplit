import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import { UserCurrencyPreference } from './entities/user-currency-preference.entity';
import { CurrencyRateCache } from './entities/currency-rate-cache.entity';
import { GeoService } from './geo/geo.service';
import { PreferredAsset } from './enums/preferred-asset.enum';
import axios from 'axios';

@Injectable()
export class CurrencyService {
  constructor(
    @InjectRepository(UserCurrencyPreference)
    private prefRepo: Repository<UserCurrencyPreference>,

    @InjectRepository(CurrencyRateCache)
    private rateRepo: Repository<CurrencyRateCache>,

    private geoService: GeoService,
  ) {}

  async detectCurrency(ip: string) {
    return this.geoService.detectFromIp(ip);
  }

  async getOrCreatePreference(userId: string, ip: string) {
    let pref = await this.prefRepo.findOne({ where: { userId } });

    if (!pref) {
      const geo = await this.geoService.detectFromIp(ip);

      pref = this.prefRepo.create({
        userId,
        preferredCurrency: geo.currency || 'USD',
        detectedCountry: geo.countryCode,
        detectedCurrency: geo.currency,
        autoDetected: true,
      });

      await this.prefRepo.save(pref);
    }

    return pref;
  }

  async updatePreference(userId: string, currency: string) {
    const pref = await this.prefRepo.findOne({ where: { userId } });
    if (!pref) throw new NotFoundException();

    pref.preferredCurrency = currency;
    pref.autoDetected = false;

    return this.prefRepo.save(pref);
  }

  async getRate(base: string, target: string) {
    const now = new Date();

    const cached = await this.rateRepo.findOne({
      where: {
        baseCurrency: base,
        targetCurrency: target,
        expiresAt: MoreThan(now),
      },
    });

    if (cached) return cached.rate;

    const rate = await this.fetchRateFromApi(base, target);

    await this.rateRepo.save({
      baseCurrency: base,
      targetCurrency: target,
      rate,
      source: 'exchangerate-api',
      fetchedAt: now,
      expiresAt: new Date(now.getTime() + 10 * 60 * 1000),
    });

    return rate;
  }

  private async fetchRateFromApi(base: string, target: string) {
    if (target === 'XLM' || target === 'USDC') {
      const { data } = await axios.get(
        `https://api.coingecko.com/api/v3/simple/price?ids=stellar,usd-coin&vs_currencies=${base.toLowerCase()}`
      );

      if (target === 'XLM') {
        return 1 / data.stellar[base.toLowerCase()];
      }

      if (target === 'USDC') {
        return 1 / data['usd-coin'][base.toLowerCase()];
      }
    }

    const { data } = await axios.get(
      `https://api.exchangerate-api.com/v4/latest/${base}`
    );

    return data.rates[target] || 1;
  }

  async convert(base: string, target: string, amount: number) {
    const rate = await this.getRate(base, target);
    return {
      base,
      target,
      amount,
      converted: amount * rate,
    };
  }
}