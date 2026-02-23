import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi, afterEach } from 'vitest';
import { QRCodeScanner } from './QRCodeScanner';
import jsQR from 'jsqr';
import { buildStellarPaymentURI } from '../../utils/stellar/paymentUri';

vi.mock('jsqr', () => ({
  default: vi.fn(),
}));

const DESTINATION = 'GDQP2KPQGKIHYJGXNUIYOMHARUARCA6NSWVE2YQYCVY75HL7P5G4U2DI';

describe('QRCodeScanner', () => {
  beforeEach(() => {
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
      callback(0);
      return 1;
    });
    vi.stubGlobal('cancelAnimationFrame', vi.fn());

    Object.defineProperty(HTMLMediaElement.prototype, 'play', {
      writable: true,
      value: vi.fn().mockResolvedValue(undefined),
    });

    Object.defineProperty(HTMLVideoElement.prototype, 'readyState', {
      configurable: true,
      get: () => 4,
    });
    Object.defineProperty(HTMLVideoElement.prototype, 'videoWidth', {
      configurable: true,
      get: () => 200,
    });
    Object.defineProperty(HTMLVideoElement.prototype, 'videoHeight', {
      configurable: true,
      get: () => 200,
    });

    Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
      configurable: true,
      value: vi.fn(() => ({
        drawImage: vi.fn(),
        getImageData: vi.fn(() => ({
          data: new Uint8ClampedArray(200 * 200 * 4),
          width: 200,
          height: 200,
        })),
      })),
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('shows an error when camera API is unavailable', async () => {
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: undefined,
    });

    render(<QRCodeScanner isOpen onClose={vi.fn()} onConfirm={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText(/camera api is not available/i)).toBeInTheDocument();
    });
  });

  it('detects a valid QR and confirms payment', async () => {
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: {
        getUserMedia: vi.fn().mockResolvedValue({
          getTracks: () => [{ stop: vi.fn() }],
        }),
      },
    });

    const uri = buildStellarPaymentURI({
      destination: DESTINATION,
      amount: 9.9,
      memo: 'split_007',
      memoType: 'text',
    });
    vi.mocked(jsQR).mockReturnValue({ data: uri } as any);
    const onConfirm = vi.fn();

    render(<QRCodeScanner isOpen onClose={vi.fn()} onConfirm={onConfirm} />);

    await waitFor(() => {
      expect(screen.getByText(/payment request detected/i)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Confirm and Pay'));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });
});
