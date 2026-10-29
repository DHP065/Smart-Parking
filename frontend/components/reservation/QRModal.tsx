'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { X, Download, Clock, CheckCircle } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';

interface QRModalProps {
  reservation: {
    _id: string;
    qrToken: string;
    exitQrToken?: string;
    status?: string;
    expiresAt: string;
    reservedAt: string;
    locationId: { name: string } | string;
  };
  onClose: () => void;
}

export default function QRModal({ reservation, onClose }: QRModalProps) {
  const [timeLeft, setTimeLeft] = useState(0);
  const qrRef = useRef<HTMLDivElement>(null);

  const calcTimeLeft = useCallback(() => {
    const diff = new Date(reservation.expiresAt).getTime() - Date.now();
    return Math.max(0, Math.floor(diff / 1000));
  }, [reservation.expiresAt]);

  useEffect(() => {
    setTimeLeft(calcTimeLeft());
    const interval = setInterval(() => {
      setTimeLeft(calcTimeLeft());
    }, 1000);
    return () => clearInterval(interval);
  }, [calcTimeLeft]);

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const pct = (timeLeft / (15 * 60)) * 100;
  const isExpiring = timeLeft < 120;

  const isExitToken = reservation.status === 'used' && reservation.exitQrToken;
  const qrValueToDisplay = isExitToken ? reservation.exitQrToken! : reservation.qrToken;

  const locationName = typeof reservation.locationId === 'string'
    ? 'Parking Location'
    : (reservation.locationId as any)?.name || 'Parking Location';

  const downloadQR = () => {
    if (!qrRef.current) return;
    const svg = qrRef.current.querySelector('svg');
    if (!svg) return;
    const data = new XMLSerializer().serializeToString(svg);
    const blob = new Blob([data], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `parking-qr-${reservation._id.slice(-6)}.svg`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <div className="relative bg-white dark:bg-gray-900 w-full sm:max-w-md sm:mx-4 rounded-t-3xl sm:rounded-3xl shadow-2xl p-6 z-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">
              {isExitToken ? 'Exit Parking Pass' : 'Your Parking Pass'}
            </h2>
            <p className="text-sm text-gray-500">{locationName}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* Timer / Status */}
        {isExitToken ? (
          <div className="mb-5 p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950 border border-emerald-100 dark:border-emerald-900">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="h-4 w-4 text-emerald-500" />
              <span className="text-sm font-medium text-emerald-600 dark:text-emerald-400">
                Vehicle is Parked
              </span>
            </div>
            <div className="text-lg font-bold text-emerald-700 dark:text-emerald-400">
              Scan QR to Exit
            </div>
          </div>
        ) : (
          <div className={`mb-5 p-4 rounded-2xl ${isExpiring ? 'bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800' : 'bg-blue-50 dark:bg-blue-950 border border-blue-100 dark:border-blue-900'}`}>
            <div className="flex items-center gap-2 mb-2">
              <Clock className={`h-4 w-4 ${isExpiring ? 'text-red-500' : 'text-blue-500'}`} />
              <span className={`text-sm font-medium ${isExpiring ? 'text-red-600 dark:text-red-400' : 'text-blue-600 dark:text-blue-400'}`}>
                {timeLeft > 0 ? 'Expires in' : 'Reservation Expired'}
              </span>
            </div>
            <div className={`text-3xl font-bold tabular-nums ${isExpiring ? 'text-red-600 dark:text-red-400' : 'text-blue-600 dark:text-blue-400'}`}>
              {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
            </div>
            <div className="mt-2 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-1000 ${isExpiring ? 'bg-red-500' : 'bg-blue-500'}`}
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        )}

        {/* QR Code */}
        <div ref={qrRef} className="flex justify-center mb-5">
          <div className="p-4 bg-white rounded-2xl border-2 border-gray-100 shadow-inner">
            <QRCodeSVG
              value={qrValueToDisplay}
              size={180}
              bgColor="#ffffff"
              fgColor="#1e293b"
              level="H"
              includeMargin={false}
            />
          </div>
        </div>

        {/* Token */}
        <div className="text-center mb-5">
          <p className="text-xs text-gray-400 mb-1">Token ID</p>
          <code className="text-xs font-mono bg-gray-100 dark:bg-gray-800 px-3 py-1.5 rounded-lg text-gray-600 dark:text-gray-300 break-all">
            {qrValueToDisplay}
          </code>
        </div>

        {/* Download */}
        <button
          onClick={downloadQR}
          className="flex items-center justify-center gap-2 w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold transition-colors"
        >
          <Download className="h-4 w-4" />
          Download QR Code
        </button>
      </div>
    </div>
  );
}
