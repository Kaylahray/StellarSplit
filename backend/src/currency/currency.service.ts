@Injectable()
export class CurrencyService {
  constructor(
    @InjectRepository(UserCurrencyPreference)
    private prefRepo: Repository<UserCurrencyPreference>,
    private geoService: GeoService,
  ) {}

  async detectFromIP(ip: string) {
    return this.geoService.detect(ip);
  }

  async getPreferences(userId: string) {
    return this.prefRepo.findOne({ where: { userId } });
  }

  async updatePreferences(userId: string, dto: UpdatePreferenceDto) {
    let pref = await this.getPreferences(userId);

    if (!pref) {
      pref = this.prefRepo.create({ userId, ...dto, autoDetected: false });
    } else {
      Object.assign(pref, dto, { autoDetected: false });
    }

    return this.prefRepo.save(pref);
  }

  async firstLoginSetup(userId: string, ip: string) {
    const existing = await this.getPreferences(userId);
    if (existing) return existing;

    const detection = await this.geoService.detect(ip);

    return this.prefRepo.save({
      userId,
      preferredCurrency: detection.currency,
      preferredAsset: 'XLM',
      detectedCountry: detection.country,
      detectedCurrency: detection.currency,
      autoDetected: true,
    });
  }
}