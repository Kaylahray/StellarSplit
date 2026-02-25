import { Injectable } from '@nestjs/common';
import { Split } from '../../entities/split.entity';
import { HistoricalRatesService } from '../historical-rates.service';

@Injectable()
export class JSONExporterService {
    constructor(private readonly ratesService: HistoricalRatesService) { }

    async generate(splits: Split[]): Promise<string> {
        const data = await Promise.all(
            splits.map(async (split) => {
                const fiatAmount = await this.ratesService.convertXlmToFiat(
                    Number(split.totalAmount),
                    split.createdAt,
                );
                return {
                    id: split.id,
                    date: split.createdAt,
                    description: split.description,
                    category: {
                        name: split.category?.name || 'Uncategorized',
                        taxDeductible: split.category?.taxDeductible || false,
                    },
                    xlmAmount: split.totalAmount,
                    fiatAmountUsd: Number(fiatAmount.toFixed(2)),
                    status: split.status,
                };
            }),
        );

        return JSON.stringify(data, null, 2);
    }
}
