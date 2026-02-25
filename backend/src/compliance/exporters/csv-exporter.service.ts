import { Injectable } from '@nestjs/common';
import { Split } from '../../entities/split.entity';
import { HistoricalRatesService } from '../historical-rates.service';

@Injectable()
export class CSVExporterService {
    constructor(private readonly ratesService: HistoricalRatesService) { }

    async generate(splits: Split[]): Promise<string> {
        const headers = ['Date', 'Description', 'Category', 'XLM Amount', 'Fiat Amount (USD)', 'Tax Deductible'];
        const rows = await Promise.all(
            splits.map(async (split) => {
                const fiatAmount = await this.ratesService.convertXlmToFiat(
                    Number(split.totalAmount),
                    split.createdAt,
                );
                return [
                    split.createdAt.toISOString().split('T')[0],
                    `"${split.description || ''}"`,
                    split.category?.name || 'Uncategorized',
                    split.totalAmount,
                    fiatAmount.toFixed(2),
                    split.category?.taxDeductible ? 'Yes' : 'No',
                ].join(',');
            }),
        );

        return [headers.join(','), ...rows].join('\n');
    }
}
