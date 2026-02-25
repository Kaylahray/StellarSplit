import { CSVExporterService } from './csv-exporter.service';
import { HistoricalRatesService } from '../historical-rates.service';
import { Split } from '../../entities/split.entity';

describe('CSVExporterService', () => {
    let service: CSVExporterService;
    let ratesService: HistoricalRatesService;

    beforeEach(() => {
        ratesService = {
            convertXlmToFiat: jest.fn().mockResolvedValue(100.50),
        } as any;
        service = new CSVExporterService(ratesService);
    });

    it('should generate a CSV with correct headers and data', async () => {
        const mockSplit = {
            id: 'split-1',
            totalAmount: 50,
            description: 'Business Lunch',
            createdAt: new Date('2025-01-01'),
            category: { name: 'Meals', taxDeductible: true },
        } as any;

        const result = await service.generate([mockSplit]);
        const lines = result.split('\n');

        expect(lines[0]).toBe('Date,Description,Category,XLM Amount,Fiat Amount (USD),Tax Deductible');
        expect(lines[1]).toContain('2025-01-01');
        expect(lines[1]).toContain('Business Lunch');
        expect(lines[1]).toContain('Meals');
        expect(lines[1]).toContain('50');
        expect(lines[1]).toContain('100.50');
        expect(lines[1]).toContain('Yes');
    });
});
