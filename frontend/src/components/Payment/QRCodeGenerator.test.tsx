import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { QRCodeGenerator } from './QRCodeGenerator';

vi.mock('qrcode.react', () => ({
  QRCodeCanvas: () => <canvas data-testid="qr-canvas" />,
}));

const DESTINATION = 'GDQP2KPQGKIHYJGXNUIYOMHARUARCA6NSWVE2YQYCVY75HL7P5G4U2DI';

describe('QRCodeGenerator', () => {
  beforeEach(() => {
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
    });
  });

  it('renders generated payment URI and QR canvas', () => {
    render(
      <QRCodeGenerator
        paymentRequest={{
          destination: DESTINATION,
          amount: 12,
          memo: 'split_123',
          memoType: 'text',
        }}
      />,
    );

    expect(screen.getByTestId('qr-canvas')).toBeInTheDocument();
    expect(screen.getByTestId('payment-uri-value').textContent).toContain('web+stellar:pay?');
    expect(screen.getByText('Download QR')).toBeInTheDocument();
  });

  it('copies URI to clipboard', async () => {
    const writeTextSpy = vi.spyOn(navigator.clipboard, 'writeText');

    render(
      <QRCodeGenerator
        paymentRequest={{
          destination: DESTINATION,
          amount: 5,
          memo: 'split_999',
          memoType: 'text',
        }}
      />,
    );

    fireEvent.click(screen.getByText('Copy URI'));
    await waitFor(() => {
      expect(writeTextSpy).toHaveBeenCalledTimes(1);
    });
  });
});
