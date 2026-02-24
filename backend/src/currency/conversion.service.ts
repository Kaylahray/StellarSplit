@Injectable()
export class ConversionService {
  constructor(private rateService: CurrencyRateService) {}

  async convert(amount: number, base: string, target: string) {
    const rate = await this.rateService.getRate(base, target);
    return {
      base,
      target,
      rate,
      amount,
      converted: amount * rate,
    };
  }
}