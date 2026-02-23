import { useMemo, useState } from 'react';
import {
  buildPaymentDeepLinks,
  extractPaymentURIFromSearch,
  parseStellarPaymentURI,
  type ParsedStellarPaymentURI,
} from '../../utils/stellar/paymentUri';

interface PaymentURIHandlerProps {
  paymentURI?: string | null;
  onPay?: (payment: ParsedStellarPaymentURI) => Promise<void> | void;
}

export const PaymentURIHandler = ({ paymentURI, onPay }: PaymentURIHandlerProps) => {
  const [isPaying, setIsPaying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resolvedUri = useMemo(() => {
    if (paymentURI) {
      return paymentURI;
    }

    if (typeof window === 'undefined') {
      return null;
    }

    return extractPaymentURIFromSearch(window.location.search);
  }, [paymentURI]);

  const parsedPayment = useMemo(() => {
    if (!resolvedUri) {
      return null;
    }
    return parseStellarPaymentURI(resolvedUri);
  }, [resolvedUri]);

  const deepLinks = useMemo(() => {
    if (!parsedPayment) {
      return null;
    }

    return buildPaymentDeepLinks(parsedPayment.uri);
  }, [parsedPayment]);

  const handleOpenWithFallback = () => {
    if (!deepLinks || typeof window === 'undefined') {
      return;
    }

    window.location.href = deepLinks.customSchemeDeepLink;
    window.setTimeout(() => {
      window.location.href = deepLinks.webFallbackLink;
    }, 1200);
  };

  const handlePay = async () => {
    if (!parsedPayment || !onPay) {
      return;
    }

    setIsPaying(true);
    setError(null);
    try {
      await onPay(parsedPayment);
    } catch (payError) {
      setError((payError as Error).message || 'Payment failed');
    } finally {
      setIsPaying(false);
    }
  };

  if (!resolvedUri) {
    return (
      <div className="rounded-xl border border-gray-200 bg-gray-50 p-3 text-sm text-gray-600">
        No payment URI found.
      </div>
    );
  }

  if (!parsedPayment || !deepLinks) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700" role="alert">
        Invalid Stellar payment URI.
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-3">
      <p className="text-sm font-semibold text-gray-800">Parsed payment details</p>
      <p className="mt-1 text-xs text-gray-600 break-all">Destination: {parsedPayment.destination}</p>
      {parsedPayment.amount ? <p className="text-xs text-gray-600">Amount: {parsedPayment.amount}</p> : null}
      {parsedPayment.memo ? <p className="text-xs text-gray-600 break-all">Memo: {parsedPayment.memo}</p> : null}

      <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
        <a
          href={deepLinks.walletDeepLink}
          className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-center text-sm font-semibold text-gray-800 hover:bg-gray-50"
        >
          Open Wallet
        </a>
        <button
          type="button"
          onClick={handleOpenWithFallback}
          className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-800 hover:bg-gray-50"
        >
          Open App Link
        </button>
        <a
          href={deepLinks.webFallbackLink}
          className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-center text-sm font-semibold text-gray-800 hover:bg-gray-50"
        >
          Web Fallback
        </a>
      </div>

      {onPay ? (
        <button
          type="button"
          onClick={() => void handlePay()}
          disabled={isPaying}
          className="mt-3 w-full rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-wait disabled:opacity-70"
        >
          {isPaying ? 'Processing...' : 'Confirm and Pay'}
        </button>
      ) : null}

      {error ? (
        <div className="mt-3 rounded-xl border border-red-200 bg-red-50 p-2 text-sm text-red-700" role="alert">
          {error}
        </div>
      ) : null}
    </div>
  );
};
