import { QBOExporterService } from './qbo-exporter.service';
import { HistoricalRatesService } from '../historical-rates.service';

describe('QBOExporterService', () => {
    let service: QBOExporterService;
    let ratesService: HistoricalRatesService;

    beforeEach(() => {
        ratesService = {
            convertXlmToFiat: jest.fn().mockResolvedValue(100.50),
        } as any;
        service = new QBOExporterService(ratesService);
    });

    it('should generate a QBO/CSV with correct format', async () => {
        const mockSplit = {
            id: 'split-1',
            totalAmount: 50,
            description: 'Tools',
            createdAt: new Date('2025-01-01'),
        } as any;

        const result = await service.generate([mockSplit]);
        const lines = result.split('\n');

        expect(lines[0]).toBe('Date,Description,Amount');
        expect(lines[1]).toContain('1/1/2025');
        expect(lines[1]).toContain('Tools');
        expect(lines[1]).toContain('-100.50'); // Negative for expenses
    });
});
