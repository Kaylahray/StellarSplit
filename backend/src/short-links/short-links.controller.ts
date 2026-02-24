import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  Body,
  Req,
} from '@nestjs/common';
import { ShortLinksService } from './short-links.service';
import { NfcPayloadService } from './nfc-payload.service';
import { GenerateLinkDto } from './dto/generate-link.dto';

@Controller('api/short-links')
export class ShortLinksController {
  constructor(
    private readonly service: ShortLinksService,
    private readonly nfcService: NfcPayloadService,
  ) {}

  @Post('generate')
  generate(@Body() dto: GenerateLinkDto, @Req() req) {
    return this.service.generate(dto, req.user.wallet);
  }

  @Get(':shortCode/resolve')
  resolve(@Param('shortCode') code: string, @Req() req) {
    return this.service.resolve(
      code,
      req.ip,
      req.headers['user-agent'],
      req.user?.id,
    );
  }

  @Get(':shortCode/analytics')
  analytics(@Param('shortCode') code: string) {
    return this.service.analytics(code);
  }

  @Post('nfc-payload/:splitId')
  generateNfc(@Param('splitId') splitId: string) {
    const url = `${process.env.FRONTEND_URL}/splits/${splitId}`;
    return this.nfcService.generateNdefPayload(url);
  }

  @Delete(':shortCode')
  delete(@Param('shortCode') code: string) {
    return this.service.delete(code);
  }
}