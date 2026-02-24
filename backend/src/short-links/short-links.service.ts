import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { SplitShortLink, LinkType } from './entities/split-short-link.entity';
import { LinkAccessLog } from './entities/link-access-log.entity';
import { GenerateLinkDto } from './dto/generate-link.dto';
import * as crypto from 'crypto';

@Injectable()
export class ShortLinksService {
  constructor(
    @InjectRepository(SplitShortLink)
    private shortLinkRepo: Repository<SplitShortLink>,

    @InjectRepository(LinkAccessLog)
    private accessLogRepo: Repository<LinkAccessLog>,
  ) {}

  // 🔹 Generate 6-char unique short code
  private async generateUniqueCode(): Promise<string> {
    let code: string;
    let exists = true;

    while (exists) {
      code = crypto.randomBytes(4).toString('base64url').slice(0, 6);
      const found = await this.shortLinkRepo.findOne({ where: { shortCode: code } });
      exists = !!found;
    }

    return code;
  }

  // 🔹 Generate link
  async generate(dto: GenerateLinkDto, wallet: string) {
    // Rate limit: 20 per split per user
    const count = await this.shortLinkRepo.count({
      where: {
        split: { id: dto.splitId },
        createdBy: wallet,
      },
    });

    if (count >= 20) {
      throw new ForbiddenException('Link generation limit reached');
    }

    const shortCode = await this.generateUniqueCode();

    const expiry =
      dto.expiryHours
        ? new Date(Date.now() + dto.expiryHours * 3600000)
        : new Date(Date.now() + 72 * 3600000); // 72 hours default

    const link = this.shortLinkRepo.create({
      split: { id: dto.splitId } as any,
      shortCode,
      linkType: dto.linkType,
      targetParticipant: dto.targetParticipantId
        ? ({ id: dto.targetParticipantId } as any)
        : null,
      expiresAt: expiry,
      createdBy: wallet,
    });

    await this.shortLinkRepo.save(link);

    const sepUri = this.buildSep0007Uri(dto.splitId);

    return {
      shortCode,
      url: `${process.env.FRONTEND_URL}/l/${shortCode}`,
      sep0007: sepUri,
      expiresAt: expiry,
    };
  }

  // 🔹 Resolve link
  async resolve(shortCode: string, ip: string, userAgent: string, userId?: string) {
    const link = await this.shortLinkRepo.findOne({
      where: { shortCode },
      relations: ['split'],
    });

    if (!link) throw new NotFoundException('Link not found');

    if (link.expiresAt < new Date()) {
      throw new BadRequestException('Link expired');
    }

    if (link.maxAccesses && link.accessCount >= link.maxAccesses) {
      throw new ForbiddenException('Max access reached');
    }

    link.accessCount++;
    await this.shortLinkRepo.save(link);

    await this.accessLogRepo.save({
      shortLink: link,
      ipHash: crypto.createHash('sha256').update(ip).digest('hex'),
      userAgent,
      resolvedUserId: userId,
    });

    return {
      redirectUrl: `${process.env.FRONTEND_URL}/splits/${link.split.id}`,
      linkType: link.linkType,
    };
  }

  // 🔹 SEP-0007 URI
  private buildSep0007Uri(splitId: string) {
    return `web+stellar:pay?destination=${process.env.PLATFORM_WALLET}&memo=${splitId}`;
  }

  async analytics(shortCode: string) {
    const logs = await this.accessLogRepo.find({
      where: { shortLink: { shortCode } },
    });

    return {
      totalAccess: logs.length,
      uniqueIPs: new Set(logs.map(l => l.ipHash)).size,
      lastAccess: logs.sort((a, b) => b.accessedAt.getTime() - a.accessedAt.getTime())[0],
    };
  }
}