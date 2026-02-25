import { Injectable } from '@nestjs/common';
import { Split } from '../../entities/split.entity';
import { HistoricalRatesService } from '../historical-rates.service';

@Injectable()
export class OFXExporterService {
    constructor(private readonly ratesService: HistoricalRatesService) { }

    async generate(splits: Split[]): Promise<string> {
        const now = new Date().toISOString().replace(/[-:T]/g, '').split('.')[0];

        let transactions = '';
        for (const split of splits) {
            const fiatAmount = await this.ratesService.convertXlmToFiat(
                Number(split.totalAmount),
                split.createdAt,
            );
            const date = split.createdAt.toISOString().replace(/[-:T]/g, '').split('.')[0];

            transactions += `
<STMTTRN>
<TRNTYPE>DEBIT
<DTPOSTED>${date}
<TRNAMT>-${fiatAmount.toFixed(2)}
<FITID>${split.id.replace(/-/g, '')}
<NAME>${(split.description || 'StellarSplit').substring(0, 32)}
</STMTTRN>`;
        }

        return `OFXHEADER:100
DATA:OFXSGML
VERSION:102
SECURITY:NONE
ENCODGING:USASCII
CHARSET:1252
COMPRESSION:NONE
OLDFILEUID:NONE
NEWFILEUID:NONE

<OFX>
<SIGNONMSGSRSV1>
<SONRS>
<STATUS>
<CODE>0
<SEVERITY>INFO
</STATUS>
<DTSERVER>${now}
<LANGUAGE>ENG
</SONRS>
</SIGNONMSGSRSV1>
<BANKMSGSRSV1>
<STMTTRNRS>
<TRNUID>${now}
<STATUS>
<CODE>0
<SEVERITY>INFO
</STATUS>
<STMTRS>
<CURDEF>USD
<BANKTRANLIST>
<DTSTART>${now}
<DTEND>${now}
${transactions}
</BANKTRANLIST>
<LEDGERBAL>
<BALAMT>0.00
<DTASOF>${now}
</LEDGERBAL>
</STMTRS>
</STMTTRNRS>
</BANKMSGSRSV1>
</OFX>`;
    }
}
