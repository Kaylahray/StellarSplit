@Injectable()
export class CurrencyRateService {
  constructor(
    @InjectRepository(CurrencyRateCache)
    private rateRepo: Repository<CurrencyRateCache>,
  ) {}

  async getRate(base: string, target: string): Promise<number> {
    const now = new Date();

    const cached = await this.rateRepo.findOne({
      where: { baseCurrency: base, targetCurrency: target },
    });

    if (cached && cached.expiresAt > now) {
      return Number(cached.rate);
    }

    const rate = await this.fetchRate(base, target);

    await this.rateRepo.save({
      baseCurrency: base,
      targetCurrency: target,
      rate,
      source: 'coingecko/exchangerate-api',
      fetchedAt: now,
      expiresAt: new Date(now.getTime() + 10 * 60 * 1000),
    });

    return rate;
  }

  private async fetchRate(base: string, target: string): Promise<number> {
    if (target === 'XLM' || target === 'USDC') {
      const res = await fetch(
        `https://api.coingecko.com/api/v3/simple/price?ids=stellar,usd-coin&vs_currencies=${base.toLowerCase()}`,
      );
      const data = await res.json();

      if (target === 'XLM') return data.stellar[base.toLowerCase()];
      if (target === 'USDC') return data['usd-coin'][base.toLowerCase()];
    }

    const res = await fetch(
      `https://open.er-api.com/v6/latest/${base}`,
    );
    const data = await res.json();

    return data.rates[target];
  }
}