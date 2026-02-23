import { useMemo, useRef, useState } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import { buildPaymentDeepLinks, buildStellarPaymentURI, type StellarPaymentRequest } from '../../utils/stellar/paymentUri';
import { QRDownload } from './QRDownload';

interface QRCodeGeneratorProps {
  paymentRequest: StellarPaymentRequest;
  title?: string;
  size?: number;
}

export const QRCodeGenerator = ({
  paymentRequest,
  title = 'Payment QR',
  size = 224,
}: QRCodeGeneratorProps) => {
  const qrContainerRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const paymentUriResult = useMemo(() => {
    try {
      return {
        uri: buildStellarPaymentURI(paymentRequest),
        error: null,
      };
    } catch (uriError) {
      return {
        uri: null,
        error: (uriError as Error).message,
      };
    }
  }, [paymentRequest]);
  const paymentUri = paymentUriResult.uri;
  const uriError = paymentUriResult.error;

  const deepLinks = useMemo(() => {
    if (!paymentUri) {
      return null;
    }
    return buildPaymentDeepLinks(paymentUri);
  }, [paymentUri]);

  const handleCopyUri = async () => {
    if (!paymentUri) {
      return;
    }

    try {
      await navigator.clipboard.writeText(paymentUri);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch (copyError) {
      setError((copyError as Error).message);
    }
  };

  if (uriError || error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700" role="alert">
        {uriError ?? error}
      </div>
    );
  }

  if (!paymentUri || !deepLinks) {
    return null;
  }

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
      <p className="mb-3 text-sm font-semibold text-gray-700">{title}</p>

      <div
        ref={qrContainerRef}
        className="mx-auto flex w-full max-w-[260px] items-center justify-center rounded-2xl bg-gradient-to-br from-slate-900 to-slate-700 p-4"
      >
        <div className="rounded-xl bg-white p-3">
          <QRCodeCanvas
            value={paymentUri}
            size={size}
            marginSize={2}
            level="M"
            fgColor="#0f172a"
            bgColor="#ffffff"
            title="Stellar payment QR code"
          />
        </div>
      </div>

      <div className="mt-3 rounded-lg bg-gray-50 p-2 text-xs text-gray-700 break-all" data-testid="payment-uri-value">
        {paymentUri}
      </div>

      <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
        <button
          type="button"
          onClick={handleCopyUri}
          className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-800 transition hover:bg-gray-50"
        >
          {copied ? 'Copied' : 'Copy URI'}
        </button>
        <a
          href={deepLinks.walletDeepLink}
          className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-center text-sm font-semibold text-gray-800 transition hover:bg-gray-50"
        >
          Open Wallet
        </a>
        <QRDownload qrContainerRef={qrContainerRef} />
      </div>
    </div>
  );
};
