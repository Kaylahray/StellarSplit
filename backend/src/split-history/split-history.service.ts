import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SplitHistory, SplitRole } from './entities/split-history.entity';
import { SplitArchive } from '../modules/archiving/entities/split-archive.entity';

@Injectable()
export class SplitHistoryService {
  constructor(
    @InjectRepository(SplitHistory)
    private readonly repo: Repository<SplitHistory>,
    @InjectRepository(SplitArchive)
    private readonly archiveRepo: Repository<SplitArchive>,
  ) {}

  async getUserHistory(wallet: string) {
    const history = await this.repo.find({
      where: { userId: wallet },
      relations: ['split'],
      order: { completionTime: 'DESC' },
    });

    // Fetch archived splits involving this user
    // Using JSONB containment operator @> to find if user is a participant
    // or checking creatorWalletAddress in splitData
    const archives = await this.archiveRepo.createQueryBuilder('archive')
      .where(`archive.splitData ->> 'creatorWalletAddress' = :wallet`, { wallet })
      .orWhere(`archive.participantData @> :participant`, { participant: JSON.stringify([{ walletAddress: wallet }]) })
      .orderBy('archive.archivedAt', 'DESC')
      .getMany();

    const mappedArchives = archives.map(archive => {
      const isCreator = archive.splitData.creatorWalletAddress === wallet;
      const participant = archive.participantData.find((p: any) => p.walletAddress === wallet);
      
      // Calculate final amount similar to SplitHistory logic
      // For creators: usually total - paid? Or received? 
      // SplitHistory defines finalAmount as: paid (-) or received (+)
      // We'll estimate based on role.
      let finalAmount = '0';
      if (participant) {
        // As participant: amountPaid (negative if we consider cost) or simply amount involved?
        // SplitHistory says "paid (-) or received (+)"
        // If I paid 50, it's -50? 
        // Let's stick to simple amount for now or 0 if unclear.
        // Actually, if it's archived (expired/unpaid), maybe just show 0 or amountOwed?
        finalAmount = participant.amountOwed ? `-${participant.amountOwed}` : '0';
      } else if (isCreator) {
        finalAmount = archive.splitData.totalAmount;
      }

      return {
        id: archive.id,
        userId: wallet,
        split: { ...archive.splitData, status: 'archived' },
        role: isCreator ? SplitRole.CREATOR : SplitRole.PARTICIPANT,
        comment: archive.archiveReason,
        splitId: archive.originalSplitId,
        finalAmount: finalAmount,
        completionTime: archive.archivedAt,
        isArchived: true
      };
    });

    // Combine and sort by date (newest first)
    const combined = [...history, ...mappedArchives].sort((a, b) => 
      new Date(b.completionTime).getTime() - new Date(a.completionTime).getTime()
    );

    return combined;
  }

  async getUserStats(wallet: string) {
    const qb = this.repo.createQueryBuilder('sh');

    const [created, participated] = await Promise.all([
      qb.clone()
        .where('sh.userId = :wallet', { wallet })
        .andWhere('sh.role = :role', { role: SplitRole.CREATOR })
        .getCount(),

      qb.clone()
        .where('sh.userId = :wallet', { wallet })
        .andWhere('sh.role = :role', { role: SplitRole.PARTICIPANT })
        .getCount(),
    ]);

    const avgAmount = await qb
      .clone()
      .select('AVG(sh.finalAmount)', 'avg')
      .where('sh.userId = :wallet', { wallet })
      .getRawOne();

    const totalAmount = await qb
      .clone()
      .select('SUM(sh.finalAmount)', 'total')
      .where('sh.userId = :wallet', { wallet })
      .getRawOne();

    const frequentPartners = await qb
      .clone()
      .select('other.userId', 'partner')
      .addSelect('COUNT(*)', 'count')
      .innerJoin(
        SplitHistory,
        'other',
        'other.splitId = sh.splitId AND other.userId != sh.userId',
      )
      .where('sh.userId = :wallet', { wallet })
      .groupBy('other.userId')
      .orderBy('count', 'DESC')
      .getRawMany();

    // Fetch archives for stats
    const archives = await this.archiveRepo.createQueryBuilder('archive')
      .where(`archive.splitData ->> 'creatorWalletAddress' = :wallet`, { wallet })
      .orWhere(`archive.participantData @> :participant`, { participant: JSON.stringify([{ walletAddress: wallet }]) })
      .getMany();

    let archivedCreated = 0;
    let archivedParticipated = 0;
    let archivedTotalAmount = 0;

    const partnerMap = new Map<string, number>();
    frequentPartners.forEach(p => partnerMap.set(p.partner, Number(p.count)));

    for (const archive of archives) {
      const isCreator = archive.splitData.creatorWalletAddress === wallet;
      
      if (isCreator) {
        archivedCreated++;
        archivedTotalAmount += Number(archive.splitData.totalAmount) || 0;
      } else {
        const p = archive.participantData.find((p: any) => p.walletAddress === wallet);
        if (p) {
          archivedParticipated++;
          archivedTotalAmount += -(Number(p.amountOwed) || 0);
        }
      }

      // Merge partners
      const creator = archive.splitData.creatorWalletAddress;
      const participants = archive.participantData
        .map((p: any) => p.walletAddress)
        .filter((w: string) => w);
      
      const allInvolved = new Set<string>();
      if (creator) allInvolved.add(creator);
      participants.forEach((p: string) => allInvolved.add(p));
      
      allInvolved.delete(wallet); // Exclude self
      
      allInvolved.forEach(partner => {
        partnerMap.set(partner, (partnerMap.get(partner) || 0) + 1);
      });
    }

    const totalCreated = created + archivedCreated;
    const totalParticipated = participated + archivedParticipated;
    const dbTotal = Number(totalAmount?.total) || 0;
    const finalTotal = dbTotal + archivedTotalAmount;
    
    const dbCount = created + participated;
    const totalCount = dbCount + archives.length;
    
    const finalAvg = totalCount > 0 ? finalTotal / totalCount : 0;

    const mergedPartners = Array.from(partnerMap.entries())
      .map(([partner, count]) => ({ partner, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return {
      totalSplitsCreated: totalCreated,
      totalSplitsParticipated: totalParticipated,
      averageSplitAmount: finalAvg,
      totalAmount: finalTotal,
      mostFrequentPartners: mergedPartners,
    };
  }


}
