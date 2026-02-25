import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';

@Injectable()
export class HistoricalRatesService {
    private readonly logger = new Logger(HistoricalRatesService.name);
    private cache = new Map<string, number>();

    /**
     * Fetches the historical price of XLM in a target currency for a specific date.
     * @param date Date of the split
     * @param currency Target fiat currency (e.g., 'USD', 'EUR')
     */
    async getXlmPrice(date: Date, currency: string = 'usd'): Promise<number> {
        const dateStr = date.toISOString().split('T')[0];
        const cacheKey = `${dateStr}-${currency.toLowerCase()}`;

        if (this.cache.has(cacheKey)) {
            return this.cache.get(cacheKey)!;
        }

        try {
            // Format date for CoinGecko: dd-mm-yyyy
            const [year, month, day] = dateStr.split('-');
            const formattedDate = `${day}-${month}-${year}`;

            const response = await axios.get(
                `https://api.coingecko.com/api/v3/coins/stellar/history`,
                {
                    params: {
                        date: formattedDate,
                        localization: 'false',
                    },
                },
            );

            const price = response.data.market_data.current_price[currency.toLowerCase()];
            this.cache.set(cacheKey, price);
            return price;
        } catch (error) {
            this.logger.error(`Failed to fetch historical rate for ${dateStr}: ${error.message}`);
            // Fallback to a default rate or throw if critical
            throw new Error(`Could not fetch historical rate for ${dateStr}`);
        }
    }

    /**
     * Converts XLM amount to fiat using historical rates.
     */
    async convertXlmToFiat(amountXlm: number, date: Date, currency: string = 'usd'): Promise<number> {
        const rate = await this.getXlmPrice(date, currency);
        return amountXlm * rate;
    }
}
