import { Controller, Post, Get, Put, Body, Param, UseGuards, Request, BadRequestException } from '@nestjs/common';
import { ArchivingService } from './archiving.service';
import { UpdateExpiryDto } from './dto/update-expiry.dto';
import { ArchiveReason } from './entities/split-archive.entity';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';

@Controller('splits')
@UseGuards(JwtAuthGuard)
export class ArchivingController {
  constructor(private readonly archivingService: ArchivingService) {}

  @Post(':splitId/archive')
  async archiveSplit(
    @Param('splitId') splitId: string,
    @Request() req: any,
  ) {
    // Assuming req.user exists if auth is enabled
    // If not, we might need to pass userId in body or headers
    const userId = req.user?.id || req.user?.walletAddress || 'system'; 
    return this.archivingService.archiveSplit(splitId, ArchiveReason.MANUALLY_ARCHIVED, userId);
  }

  @Post(':splitId/restore')
  async restoreSplit(@Param('splitId') splitId: string) {
    // Requirements say "POST /api/splits/:splitId/restore"
    // We assume splitId here refers to the ORIGINAL split ID that was archived.
    return this.archivingService.restoreSplitByOriginalId(splitId);
  }

  @Get('archived')
  async getArchivedSplits() {
    return this.archivingService.getArchivedSplits();
  }

  @Get('archived/:archiveId')
  async getArchivedSplit(@Param('archiveId') archiveId: string) {
    return this.archivingService.getArchivedSplit(archiveId);
  }

  @Put(':splitId/expiry-date')
  async updateExpiryDate(
    @Param('splitId') splitId: string,
    @Body() dto: UpdateExpiryDto,
  ) {
    const expiryDate = new Date(dto.expiryDate);
    if (isNaN(expiryDate.getTime())) {
      throw new BadRequestException('Invalid date format');
    }
    return this.archivingService.updateExpiryDate(splitId, expiryDate);
  }

  @Get('expiring-soon')
  async getExpiringSoon() {
    return this.archivingService.getExpiringSoon();
  }
}
