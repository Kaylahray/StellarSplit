@Controller('api/currency')
export class CurrencyController {
  constructor(
    private currencyService: CurrencyService,
    private conversionService: ConversionService,
  ) {}

  @Get('detect')
  async detect(@Req() req) {
    const ip = req.ip;
    return this.currencyService.detectFromIP(ip);
  }

  @Get('preferences')
  async getPref(@Req() req) {
    return this.currencyService.getPreferences(req.user.wallet);
  }

  @Put('preferences')
  async updatePref(@Req() req, @Body() dto: UpdatePreferenceDto) {
    return this.currencyService.updatePreferences(req.user.wallet, dto);
  }

  @Get('rates')
  async rates(@Query('base') base: string, @Query('targets') targets: string) {
    const targetList = targets.split(',');
    return Promise.all(
      targetList.map(target =>
        this.conversionService.convert(1, base, target),
      ),
    );
  }

  @Post('convert')
  async convert(@Body() dto: ConvertDto) {
    return this.conversionService.convert(
      dto.amount,
      dto.base,
      dto.target,
    );
  }

  @Get('supported')
  getSupported() {
    return Intl.supportedValuesOf('currency'); // 150+ currencies
  }
}