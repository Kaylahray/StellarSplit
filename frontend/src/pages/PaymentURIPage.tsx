import { useState } from 'react';
import { PaymentURIHandler } from '../components/Payment/PaymentURIHandler';
import { signAndSubmitPayment } from '../utils/stellar/wallet';
import type { ParsedStellarPaymentURI } from '../utils/stellar/paymentUri';

const PaymentURIPage = () => {
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);

  const handlePay = async (payment: ParsedStellarPaymentURI) => {
    if (!payment.amount) {
      throw new Error('Payment amount is required.');
    }

    setStatus('idle');
    setError(null);
    const result = await signAndSubmitPayment(payment.amount, payment.destination);
    if (!result.success) {
      setStatus('error');
      setError('Could not submit payment.');
      throw new Error('Could not submit payment.');
    }

    setStatus('success');
  };

  return (
    <main className="mx-auto max-w-xl p-4">
      <h1 className="mb-2 text-2xl font-bold text-gray-900">Stellar Payment Request</h1>
      <p className="mb-4 text-sm text-gray-600">Review the payment details and continue in your wallet.</p>

      <PaymentURIHandler onPay={handlePay} />

      {status === 'success' ? (
        <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
          Payment submitted successfully.
        </div>
      ) : null}

      {status === 'error' && error ? (
        <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>
      ) : null}
    </main>
  );
};

export default PaymentURIPage;
