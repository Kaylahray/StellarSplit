import { describe, expect, it } from 'vitest';
import {
  buildPaymentDeepLinks,
  buildStellarPaymentURI,
  extractPaymentURIFromSearch,
  parseStellarPaymentURI,
} from './paymentUri';

const DESTINATION = 'GDQP2KPQGKIHYJGXNUIYOMHARUARCA6NSWVE2YQYCVY75HL7P5G4U2DI';

describe('paymentUri utilities', () => {
  it('builds a SEP-0007 payment URI', () => {
    const uri = buildStellarPaymentURI({
      destination: DESTINATION,
      amount: 12.5,
      memo: 'split_123',
      memoType: 'text',
      message: 'Split payment',
    });

    expect(uri.startsWith('web+stellar:pay?')).toBe(true);
    expect(uri).toContain(`destination=${DESTINATION}`);
    expect(uri).toContain('amount=12.5');
    expect(uri).toContain('memo=split_123');
    expect(uri).toContain('memo_type=text');
  });

  it('parses a valid SEP-0007 URI', () => {
    const uri = buildStellarPaymentURI({
      destination: DESTINATION,
      amount: 8.75,
      memo: 'split_456',
      memoType: 'text',
    });

    const parsed = parseStellarPaymentURI(uri);
    expect(parsed).not.toBeNull();
    expect(parsed?.destination).toBe(DESTINATION);
    expect(parsed?.amount).toBe(8.75);
    expect(parsed?.memo).toBe('split_456');
  });

  it('rejects invalid URIs', () => {
    const parsed = parseStellarPaymentURI('web+stellar:pay?destination=BAD&amount=10');
    expect(parsed).toBeNull();
  });

  it('creates deep links with custom scheme and fallback', () => {
    const uri = buildStellarPaymentURI({ destination: DESTINATION, amount: 4 });
    const links = buildPaymentDeepLinks(uri, { fallbackBaseUrl: 'https://stellarsplit.app' });

    expect(links.walletDeepLink).toBe(uri);
    expect(links.customSchemeDeepLink).toContain('stellarsplit://pay?uri=');
    expect(links.webFallbackLink).toContain('https://stellarsplit.app/pay?uri=');
  });

  it('extracts encoded URI from query params', () => {
    const uri = buildStellarPaymentURI({ destination: DESTINATION, amount: 1.23 });
    const encoded = encodeURIComponent(uri);
    const result = extractPaymentURIFromSearch(`?uri=${encoded}`);
    expect(result).toBe(uri);
  });
});
