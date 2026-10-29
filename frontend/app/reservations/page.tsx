'use client';

import { useEffect, useState } from 'react';
import UserNavbar from '@/components/shared/UserNavbar';
import QRModal from '@/components/reservation/QRModal';
import api from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { Calendar, MapPin, Clock, QrCode, X, AlertTriangle } from 'lucide-react';
import Link from 'next/link';

const STATUS_CONFIG: Record<string, { label: string; classes: string }> = {
  active: { label: 'Active', classes: 'text-emerald-700 bg-emerald-100 dark:text-emerald-400 dark:bg-emerald-950' },
  expired: { label: 'Expired', classes: 'text-gray-600 bg-gray-100 dark:text-gray-400 dark:bg-gray-800' },
  used: { label: 'Used', classes: 'text-blue-700 bg-blue-100 dark:text-blue-400 dark:bg-blue-950' },
  cancelled: { label: 'Cancelled', classes: 'text-red-600 bg-red-100 dark:text-red-400 dark:bg-red-950' },
  completed: { label: 'Completed', classes: 'text-purple-700 bg-purple-100 dark:text-purple-400 dark:bg-purple-950' }
};

function CountdownBadge({ expiresAt }: { expiresAt: string }) {
  const [timeLeft, setTimeLeft] = useState(0);
  useEffect(() => {
    const calc = () => Math.max(0, Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000));
    setTimeLeft(calc());
    const iv = setInterval(() => setTimeLeft(calc()), 1000);
    return () => clearInterval(iv);
  }, [expiresAt]);
  const m = Math.floor(timeLeft / 60);
  const s = timeLeft % 60;
  return (
    <span className={`text-xs font-mono font-bold ${timeLeft < 120 ? 'text-red-500' : 'text-emerald-600 dark:text-emerald-400'}`}>
      {String(m).padStart(2, '0')}:{String(s).padStart(2, '0')}
    </span>
  );
}

export default function ReservationsPage() {
  const { user } = useAuth();
  const [reservations, setReservations] = useState<any[]>([]);
  const [selectedQR, setSelectedQR] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchReservations = async () => {
    try {
      const res = await api.get('/api/reservations/my');
      setReservations(res.data.reservations);
    } catch {
      toast.error('Failed to load reservations');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) fetchReservations();
    else setLoading(false);
  }, [user]);

  const handleCancel = async (id: string) => {
    if (!confirm('Cancel this reservation?')) return;
    try {
      await api.patch(`/api/reservations/${id}/cancel`);
      toast.success('Reservation cancelled');
      fetchReservations();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to cancel');
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
        <UserNavbar />
        <div className="pt-28 flex flex-col items-center text-center px-4">
          <AlertTriangle className="h-12 w-12 text-amber-400 mb-3" />
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Sign in Required</h2>
          <p className="text-gray-500 mb-4">You must be signed in to view your reservations.</p>
          <Link href="/auth/login" className="px-6 py-2.5 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors">
            Sign In
          </Link>
        </div>
      </div>
    );
  }

  const active = reservations.filter(r => r.status === 'active' || r.status === 'used');
  const past = reservations.filter(r => r.status !== 'active' && r.status !== 'used');

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <UserNavbar />
      <div className="pt-20 max-w-2xl mx-auto px-4 py-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">My Reservations</h1>
          <p className="text-sm text-gray-500 mt-1">{reservations.length} total reservation{reservations.length !== 1 ? 's' : ''}</p>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1,2,3].map(i => (
              <div key={i} className="h-32 bg-white dark:bg-gray-900 rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : (
          <>
            {active.length > 0 && (
              <div className="mb-6">
                <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Active</h2>
                <div className="space-y-3">
                  {active.map(r => <ReservationCard key={r._id} r={r} onQR={() => setSelectedQR(r)} onCancel={() => handleCancel(r._id)} />)}
                </div>
              </div>
            )}

            {past.length > 0 && (
              <div>
                <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Past</h2>
                <div className="space-y-3">
                  {past.map(r => <ReservationCard key={r._id} r={r} onQR={() => setSelectedQR(r)} />)}
                </div>
              </div>
            )}

            {reservations.length === 0 && (
              <div className="text-center py-16">
                <Calendar className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">No reservations yet</h3>
                <p className="text-gray-500 text-sm mb-4">Find a parking spot on the map to get started.</p>
                <Link href="/" className="inline-block px-6 py-2.5 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors">
                  Find Parking
                </Link>
              </div>
            )}
          </>
        )}
      </div>

      {selectedQR && (
        <QRModal
          reservation={selectedQR}
          onClose={() => setSelectedQR(null)}
        />
      )}
    </div>
  );
}

function ReservationCard({
  r, onQR, onCancel
}: {
  r: any; onQR: () => void; onCancel?: () => void;
}) {
  const cfg = STATUS_CONFIG[r.status] || { 
    label: r.status, 
    classes: 'text-gray-600 bg-gray-100 dark:text-gray-400 dark:bg-gray-800' 
  };
  const locName = r.locationId?.name || 'Parking Location';
  const locAddr = r.locationId?.address || '';

  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-900 dark:text-white truncate">{locName}</h3>
          {locAddr && (
            <div className="flex items-center gap-1 text-xs text-gray-400 mt-0.5">
              <MapPin className="h-3 w-3" />
              <span className="truncate">{locAddr}</span>
            </div>
          )}
        </div>
        <span className={`text-xs font-medium px-2.5 py-1 rounded-full flex-shrink-0 ${cfg.classes}`}>
          {cfg.label}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-4 text-xs text-gray-500 dark:text-gray-400">
        <div className="flex items-center gap-1.5">
          <Calendar className="h-3.5 w-3.5" />
          <span>{format(new Date(r.reservedAt), 'MMM d, yyyy h:mm a')}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Clock className="h-3.5 w-3.5" />
          {r.status === 'active'
            ? <CountdownBadge expiresAt={r.expiresAt} />
            : r.status === 'used' ? <span className="text-blue-600 dark:text-blue-400 font-medium">Currently Parked</span> : <span>Exp: {format(new Date(r.expiresAt), 'h:mm a')}</span>
          }
        </div>
      </div>

      <div className="flex gap-2">
        <button
          onClick={onQR}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950 dark:hover:bg-blue-900 text-blue-600 dark:text-blue-400 rounded-xl text-sm font-medium transition-colors"
        >
          <QrCode className="h-4 w-4" />
          View QR
        </button>
        {r.status === 'active' && onCancel && (
          <button
            onClick={onCancel}
            className="flex items-center justify-center gap-1.5 py-2 px-4 bg-red-50 hover:bg-red-100 dark:bg-red-950 dark:hover:bg-red-900 text-red-600 dark:text-red-400 rounded-xl text-sm font-medium transition-colors"
          >
            <X className="h-4 w-4" />
            Cancel
          </button>
        )}
      </div>
    </div>
  );
}
