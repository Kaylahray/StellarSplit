import { Injectable } from '@nestjs/common';

@Injectable()
export class NfcPayloadService {
  generateNdefPayload(url: string) {
    const uriRecord = Buffer.from(url, 'utf8');

    return {
      ndefMessage: {
        tnf: 1,
        type: 'U',
        payload: uriRecord.toString('hex'),
      },
    };
  }
}