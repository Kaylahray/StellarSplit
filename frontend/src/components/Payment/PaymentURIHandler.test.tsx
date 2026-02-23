import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { PaymentURIHandler } from './PaymentURIHandler';
import { buildStellarPaymentURI } from '../../utils/stellar/paymentUri';

const DESTINATION = 'GDQP2KPQGKIHYJGXNUIYOMHARUARCA6NSWVE2YQYCVY75HL7P5G4U2DI';

describe('PaymentURIHandler', () => {
  it('renders parsed payment details for valid URI', () => {
    const uri = buildStellarPaymentURI({
      destination: DESTINATION,
      amount: 7.5,
      memo: 'split_abc',
      memoType: 'text',
    });

    render(<PaymentURIHandler paymentURI={uri} />);

    expect(screen.getByText('Parsed payment details')).toBeInTheDocument();
    expect(screen.getByText(new RegExp(DESTINATION))).toBeInTheDocument();
    expect(screen.getByText(/Amount: 7.5/)).toBeInTheDocument();
  });

  it('shows error for invalid URI', () => {
    render(<PaymentURIHandler paymentURI="web+stellar:pay?destination=BAD" />);
    expect(screen.getByText('Invalid Stellar payment URI.')).toBeInTheDocument();
  });

  it('calls onPay when confirming payment', async () => {
    const uri = buildStellarPaymentURI({
      destination: DESTINATION,
      amount: 3.25,
      memo: 'split_xyz',
      memoType: 'text',
    });
    const onPay = vi.fn().mockResolvedValue(undefined);

    render(<PaymentURIHandler paymentURI={uri} onPay={onPay} />);
    fireEvent.click(screen.getByText('Confirm and Pay'));

    await waitFor(() => {
      expect(onPay).toHaveBeenCalledTimes(1);
    });
  });
});
