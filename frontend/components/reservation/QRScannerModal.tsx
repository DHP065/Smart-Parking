import React, { useState, useEffect } from 'react';
import { Scanner } from '@yudiel/react-qr-scanner';
import { X, QrCode } from 'lucide-react';
import api from '@/lib/api';
import { toast } from 'sonner';

interface QRScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onVerifySuccess?: () => void;
  scanType?: 'entry' | 'exit';
  locationId?: string | null;
}

export default function QRScannerModal({ isOpen, onClose, onVerifySuccess, scanType = 'entry', locationId }: QRScannerModalProps) {
  const [manualToken, setManualToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<'scan' | 'manual'>('scan');
  const [locations, setLocations] = useState<any[]>([]);
  const [selectedLocation, setSelectedLocation] = useState(locationId || '');

  useEffect(() => {
     if (isOpen && !locationId) {
        api.get('/api/parking').then(res => {
           setLocations(res.data.locations || []);
           if (res.data.locations?.length > 0 && !selectedLocation) {
              setSelectedLocation(res.data.locations[0]._id);
           }
        }).catch(() => toast.error('Failed to load locations'));
     } else if (locationId) {
         setSelectedLocation(locationId);
     }
  }, [isOpen, locationId]);

  if (!isOpen) return null;

  const handleVerify = async (token: string) => {
    if (loading) return;
    const finalLocationId = locationId || selectedLocation;
    if (!finalLocationId) {
        toast.error('Please select a location first');
        return;
    }
    setLoading(true);
    try {
      const endpoint = scanType === 'entry' ? '/api/reservations/verify' : '/api/reservations/verify-exit';
      const payload = scanType === 'entry' ? { qrToken: token, locationId: finalLocationId } : { exitQrToken: token, locationId: finalLocationId };
      const res = await api.post(endpoint, payload);
      toast.success(res.data.message || `Vehicle ${scanType === 'entry' ? 'verified' : 'exited'} successfully!`);
      if (onVerifySuccess) onVerifySuccess();
      onClose();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Verification failed');
      // In case they want to retry scanning immediately without closing
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <QrCode className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            <h3 className="font-semibold text-gray-900 dark:text-white">Verify Parking</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto">
          {/* Location Selector (if not provided by parent) */}
          {!locationId && (
            <div className="mb-4">
               <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                 Select Scanner Location
               </label>
               <select 
                 value={selectedLocation} 
                 onChange={e => setSelectedLocation(e.target.value)}
                 className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white"
               >
                 <option value="" disabled>Select a location</option>
                 {locations.map(l => <option key={l._id} value={l._id}>{l.name}</option>)}
               </select>
            </div>
          )}

          {/* Mode Switcher */}
          <div className="flex bg-gray-100 dark:bg-gray-800 rounded-lg p-1 mb-6">
            <button
              className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-colors ${
                mode === 'scan'
                  ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
              }`}
              onClick={() => setMode('scan')}
            >
              Scan QR
            </button>
            <button
              className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-colors ${
                mode === 'manual'
                  ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
              }`}
              onClick={() => setMode('manual')}
            >
              Manual Entry
            </button>
          </div>

          {mode === 'scan' ? (
            <div className="rounded-xl overflow-hidden bg-black aspect-square relative flex items-center justify-center border border-gray-200 dark:border-gray-800">
              {loading ? (
                <div className="text-white text-sm animate-pulse">Verifying...</div>
              ) : (
                <Scanner
                  onScan={(detectedCodes) => {
                    if (detectedCodes && detectedCodes.length > 0) {
                      const token = detectedCodes[0].rawValue;
                      if (token) {
                        handleVerify(token);
                      }
                    }
                  }}
                  onError={(err) => {
                    console.error('Scan error:', err);
                  }}
                  styles={{
                    container: { width: '100%', height: '100%' }
                  }}
                />
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Reservation Token
                </label>
                <input
                  type="text"
                  value={manualToken}
                  onChange={(e) => setManualToken(e.target.value)}
                  placeholder="Paste UUID token here"
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <button
                onClick={() => handleVerify(manualToken)}
                disabled={!manualToken.trim() || loading}
                className="w-full py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg font-medium transition-colors"
              >
                {loading ? 'Verifying...' : 'Verify Token'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
