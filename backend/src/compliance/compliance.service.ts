import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { ExpenseCategory } from './entities/expense-category.entity';
import { TaxExportRequest, ExportStatus, ExportFormat } from './entities/tax-export-request.entity';
import { Split } from '../entities/split.entity';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';

@Injectable()
export class ComplianceService {
    constructor(
        @InjectRepository(ExpenseCategory)
        private categoryRepo: Repository<ExpenseCategory>,
        @InjectRepository(TaxExportRequest)
        private exportRepo: Repository<TaxExportRequest>,
        @InjectRepository(Split)
        private splitRepo: Repository<Split>,
        @InjectQueue('compliance-export')
        private exportQueue: Queue,
    ) { }

    async createCategory(userId: string, data: Partial<ExpenseCategory>) {
        const category = this.categoryRepo.create({ ...data, userId });
        return this.categoryRepo.save(category);
    }

    async getCategories(userId: string) {
        return this.categoryRepo.find({ where: { userId } });
    }

    async assignCategoryToSplit(splitId: string, categoryId: string) {
        const split = await this.splitRepo.findOne({ where: { id: splitId } });
        if (!split) throw new NotFoundException('Split not found');

        const category = await this.categoryRepo.findOne({ where: { id: categoryId } });
        if (!category) throw new NotFoundException('Category not found');

        split.categoryId = categoryId;
        return this.splitRepo.save(split);
    }

    async requestExport(userId: string, data: any) {
        const request = this.exportRepo.create({
            userId,
            exportFormat: data.exportFormat,
            periodStart: new Date(data.periodStart),
            periodEnd: new Date(data.periodEnd),
            filters: data.filters,
            status: ExportStatus.QUEUED,
        });

        const savedRequest = await this.exportRepo.save(request);

        await this.exportQueue.add('generate-export', {
            requestId: savedRequest.id,
        });

        return savedRequest;
    }

    async getExportStatus(requestId: string) {
        const request = await this.exportRepo.findOne({ where: { id: requestId } });
        if (!request) throw new NotFoundException('Export request not found');
        return request;
    }

    async getSummary(userId: string, year: number) {
        const start = new Date(`${year}-01-01`);
        const end = new Date(`${year}-12-31`);

        const splits = await this.splitRepo.find({
            where: {
                creatorWalletAddress: userId, // Assuming creator is the one reporting
                createdAt: Between(start, end),
            },
            relations: ['category'],
        });

        const summary: Record<string, { total: number; deductible: number }> = {};

        for (const split of splits) {
            const categoryName = split.category?.name || 'Uncategorized';
            if (!summary[categoryName]) {
                summary[categoryName] = { total: 0, deductible: 0 };
            }

            const amount = Number(split.totalAmount);
            summary[categoryName].total += amount;
            if (split.category?.taxDeductible) {
                summary[categoryName].deductible += amount;
            }
        }

        return summary;
    }

    async getTaxDeductibleTotal(userId: string, period: string) {
        const year = parseInt(period);
        const summary = await this.getSummary(userId, year);

        return Object.values(summary).reduce((acc, curr) => acc + curr.deductible, 0);
    }
}
