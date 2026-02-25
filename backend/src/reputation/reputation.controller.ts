import { Controller, Get, Param, Req } from '@nestjs/common';
import { ReputationService } from './reputation.service';

@Controller('api/reputation')
export class ReputationController {
  constructor(private readonly service: ReputationService) {}

  @Get(':walletAddress')
  async getReputation(@Param('walletAddress') walletAddress: string) {
    return this.service.getReputation(walletAddress);
  }

  @Get('my-score')
  async myScore(@Req() req) {
    return this.service.getReputation(req.user.walletAddress);
  }

  @Get(':walletAddress/history')
  async history(@Param('walletAddress') walletAddress: string) {
    return this.service.getHistory(walletAddress);
  }

  @Get('leaderboard/trusted-payers')
  async leaderboard() {
    return this.service.leaderboard();
  }

  @Get('badge/:walletAddress')
  async badge(@Param('walletAddress') walletAddress: string) {
    return this.service.getBadge(walletAddress);
  }
}
