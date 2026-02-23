import type { RefObject } from 'react';

interface QRDownloadProps {
  qrContainerRef: RefObject<HTMLElement | null>;
  fileName?: string;
  className?: string;
  onError?: (error: Error) => void;
}

export const QRDownload = ({
  qrContainerRef,
  fileName = 'stellar-payment-qr.png',
  className,
  onError,
}: QRDownloadProps) => {
  const handleDownload = () => {
    try {
      const canvas = qrContainerRef.current?.querySelector('canvas');
      if (!canvas) {
        throw new Error('QR canvas element not found');
      }

      const href = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.href = href;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      onError?.(error as Error);
    }
  };

  return (
    <button
      type="button"
      onClick={handleDownload}
      className={
        className ??
        'w-full rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-800 transition hover:bg-gray-50'
      }
      aria-label="Download QR code"
    >
      Download QR
    </button>
  );
};
