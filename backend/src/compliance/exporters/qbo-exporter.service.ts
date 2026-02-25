import { Injectable } from '@nestjs/common';
import { Split } from '../../entities/split.entity';
import { HistoricalRatesService } from '../historical-rates.service';

@Injectable()
export class QBOExporterService {
    constructor(private readonly ratesService: HistoricalRatesService) { }

    async generate(splits: Split[]): Promise<string> {
        // Basic QBO format (CSV-based import for QuickBooks Online)
        const headers = ['Date', 'Description', 'Amount'];
        const rows = await Promise.all(
            splits.map(async (split) => {
                const fiatAmount = await this.ratesService.convertXlmToFiat(
                    Number(split.totalAmount),
                    split.createdAt,
                );
                // Withdrawals/Expenses are negative in QBO
                const amount = -fiatAmount;
                return [
                    split.createdAt.toLocaleDateString('en-US'),
                    split.description || 'StellarSplit Transaction',
                    amount.toFixed(2),
                ].join(',');
            }),
        );

        return [headers.join(','), ...rows].join('\n');
    }
}
