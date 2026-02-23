import { useCallback, useEffect, useRef, useState } from 'react';
import jsQR from 'jsqr';
import { parseStellarPaymentURI, type ParsedStellarPaymentURI } from '../../utils/stellar/paymentUri';

interface QRCodeScannerProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (payment: ParsedStellarPaymentURI) => void;
}

type ScannerStatus = 'idle' | 'starting' | 'scanning' | 'detected' | 'error';

export const QRCodeScanner = ({ isOpen, onClose, onConfirm }: QRCodeScannerProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [status, setStatus] = useState<ScannerStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [detectedPayment, setDetectedPayment] = useState<ParsedStellarPaymentURI | null>(null);
  const [rawValue, setRawValue] = useState<string | null>(null);

  const stopCamera = useCallback(() => {
    if (animationFrameRef.current !== null) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  }, []);

  const scanCurrentFrame = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) {
      return;
    }

    if (video.readyState < 2) {
      animationFrameRef.current = requestAnimationFrame(scanCurrentFrame);
      return;
    }

    const width = video.videoWidth;
    const height = video.videoHeight;
    if (!width || !height) {
      animationFrameRef.current = requestAnimationFrame(scanCurrentFrame);
      return;
    }

    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d', { willReadFrequently: true });
    if (!context) {
      setStatus('error');
      setError('Could not initialize camera canvas.');
      return;
    }

    context.drawImage(video, 0, 0, width, height);
    const imageData = context.getImageData(0, 0, width, height);
    const qrResult = jsQR(imageData.data, imageData.width, imageData.height, {
      inversionAttempts: 'attemptBoth',
    });

    if (qrResult?.data) {
      setRawValue(qrResult.data);
      const parsed = parseStellarPaymentURI(qrResult.data);
      if (!parsed) {
        setStatus('error');
        setError('QR code found, but it is not a valid Stellar payment URI.');
        return;
      }
      setDetectedPayment(parsed);
      setStatus('detected');
      stopCamera();
      return;
    }

    animationFrameRef.current = requestAnimationFrame(scanCurrentFrame);
  }, [stopCamera]);

  const startCamera = useCallback(async () => {
    if (!isOpen) {
      return;
    }

    setStatus('starting');
    setError(null);
    setDetectedPayment(null);
    setRawValue(null);

    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error('Camera API is not available in this browser.');
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
        audio: false,
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      setStatus('scanning');
      animationFrameRef.current = requestAnimationFrame(scanCurrentFrame);
    } catch (cameraError) {
      setStatus('error');
      setError((cameraError as Error).message || 'Unable to access camera.');
    }
  }, [isOpen, scanCurrentFrame]);

  const parseUploadedImage = async (file: File) => {
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(new Error('Failed to read selected image.'));
      reader.readAsDataURL(file);
    });

    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('Uploaded file is not a readable image.'));
      img.src = dataUrl;
    });

    const canvas = canvasRef.current;
    if (!canvas) {
      throw new Error('Could not initialize scanner canvas.');
    }

    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;
    const context = canvas.getContext('2d', { willReadFrequently: true });
    if (!context) {
      throw new Error('Could not read image for QR scanning.');
    }

    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
    const qrResult = jsQR(imageData.data, imageData.width, imageData.height, {
      inversionAttempts: 'attemptBoth',
    });

    if (!qrResult?.data) {
      throw new Error('No QR code detected in the uploaded image.');
    }

    setRawValue(qrResult.data);
    const parsed = parseStellarPaymentURI(qrResult.data);
    if (!parsed) {
      throw new Error('QR code detected, but payment details are invalid.');
    }

    setDetectedPayment(parsed);
    setStatus('detected');
    setError(null);
  };

  useEffect(() => {
    if (!isOpen) {
      stopCamera();
      setStatus('idle');
      return;
    }

    void startCamera();
    return () => {
      stopCamera();
    };
  }, [isOpen, startCamera, stopCamera]);

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" role="dialog" aria-modal="true">
      <div className="w-full max-w-xl rounded-2xl bg-white p-4 shadow-xl">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900">Scan Payment QR</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-gray-200 px-3 py-1 text-sm font-semibold text-gray-600 hover:bg-gray-50"
          >
            Close
          </button>
        </div>

        <div className="overflow-hidden rounded-xl bg-black">
          <video ref={videoRef} className="h-64 w-full object-cover" playsInline muted autoPlay />
          <canvas ref={canvasRef} className="hidden" />
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <label className="cursor-pointer rounded-xl border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50">
            Upload QR Image
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (!file) {
                  return;
                }
                setError(null);
                void parseUploadedImage(file).catch((uploadError) => {
                  setStatus('error');
                  setError((uploadError as Error).message);
                });
              }}
            />
          </label>
          <button
            type="button"
            onClick={() => void startCamera()}
            className="rounded-xl border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
          >
            Retry Camera
          </button>
          <span className="text-sm text-gray-500 capitalize">Status: {status}</span>
        </div>

        {error ? (
          <div className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700" role="alert">
            {error}
          </div>
        ) : null}

        {detectedPayment ? (
          <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3">
            <p className="text-sm font-semibold text-emerald-800">Payment request detected</p>
            <p className="mt-1 text-sm text-emerald-700 break-all">Destination: {detectedPayment.destination}</p>
            {detectedPayment.amount ? (
              <p className="text-sm text-emerald-700">Amount: {detectedPayment.amount}</p>
            ) : null}
            {detectedPayment.memo ? (
              <p className="text-sm text-emerald-700 break-all">Memo: {detectedPayment.memo}</p>
            ) : null}
            <button
              type="button"
              onClick={() => onConfirm(detectedPayment)}
              className="mt-3 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
            >
              Confirm and Pay
            </button>
          </div>
        ) : null}

        {rawValue && !detectedPayment ? (
          <div className="mt-3 rounded-lg bg-gray-50 p-2 text-xs text-gray-600 break-all">{rawValue}</div>
        ) : null}
      </div>
    </div>
  );
};
