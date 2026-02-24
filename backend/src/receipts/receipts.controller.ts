import { Controller, Post, Get, Delete, Param, UploadedFile, UseInterceptors, Req } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ReceiptsService } from './receipts.service';

@Controller('api/receipts')
export class ReceiptsController {
  constructor(private readonly service: ReceiptsService) {}

  @Post('upload/:splitId')
  @UseInterceptors(FileInterceptor('file'))
  async upload(@Param('splitId') splitId: string, @UploadedFile() file: Express.Multer.File, @Req() req) {
    return this.service.upload(splitId, file, req.user.walletAddress);
  }

  @Get('split/:splitId')
  async listBySplit(@Param('splitId') splitId: string) {
    return this.service.listBySplit(splitId);
  }

  @Get(':receiptId/signed-url')
  async signedUrl(@Param('receiptId') receiptId: string) {
    return this.service.getSignedUrl(receiptId);
  }

  @Delete(':receiptId')
  async delete(@Param('receiptId') receiptId: string) {
    return this.service.softDelete(receiptId);
  }

  @Get(':receiptId/ocr-data')
  async ocrData(@Param('receiptId') receiptId: string) {
    return this.service.getOcrData(receiptId);
  }

  @Post(':receiptId/reprocess-ocr')
  async reprocessOcr(@Param('receiptId') receiptId: string) {
    return this.service.reprocessOcr(receiptId);
  }
}
