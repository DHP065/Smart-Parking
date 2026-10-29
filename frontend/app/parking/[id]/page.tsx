'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import UserNavbar from '@/components/shared/UserNavbar';
import SlotGrid from '@/components/parking/SlotGrid';
import QRModal from '@/components/reservation/QRModal';
import api from '@/lib/api';
import { connectSocket, joinLocationRoom, leaveLocationRoom } from '@/lib/socket';
import { useAuth } from '@/lib/auth-context';
import { toast } from 'sonner';
import { MapPin, Car, ArrowLeft, Shield, AlertCircle } from 'lucide-react';
import Link from 'next/link';

function haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const STATUS_CONFIG = {
  available: { label: 'Available', classes: 'text-emerald-700 bg-emerald-100 border-emerald-200 dark:text-emerald-400 dark:bg-emerald-950 dark:border-emerald-800' },
  full: { label: 'Full', classes: 'text-red-700 bg-red-100 border-red-200 dark:text-red-400 dark:bg-red-950 dark:border-red-800' },
  reserved: { label: 'Reserved', classes: 'text-amber-700 bg-amber-100 border-amber-200 dark:text-amber-400 dark:bg-amber-950 dark:border-amber-800' }
};

export default function ParkingDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const router = useRouter();
  const [location, setLocation] = useState<any>(null);
  const [slots, setSlots] = useState<any[]>([]);
  const [slotSummary, setSlotSummary] = useState<any>({});
  const [reserving, setReserving] = useState(false);
  const [activeReservation, setActiveReservation] = useState<any>(null);
  const [showQR, setShowQR] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const res = await api.get(`/api/parking/${id}`);
      setLocation(res.data.location);
      setSlots(res.data.slots);
      setSlotSummary(res.data.slotSummary);
    } catch {
      toast.error('Failed to load parking details');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchData();

    // Socket.IO
    const socket = connectSocket();
    joinLocationRoom(id);

    socket.on('slot:update', ({ slotId, status }: any) => {
      setSlots(prev => prev.map(s => s._id === slotId ? { ...s, status } : s));
    });

    socket.on('lot:status', ({ locationId, status, availableSlots }: any) => {
      if (locationId === id) {
        setLocation((prev: any) => prev ? { ...prev, status, availableSlots } : prev);
        setSlotSummary((prev: any) => ({ ...prev, empty: availableSlots }));
      }
    });

    socket.on('reservation:expired', ({ reservationId }: any) => {
      if (activeReservation?._id === reservationId) {
        toast.warning('Your reservation has expired');
        setActiveReservation(null);
        setShowQR(false);
      }
    });

    return () => {
      leaveLocationRoom(id);
      socket.off('slot:update');
      socket.off('lot:status');
      socket.off('reservation:expired');
    };
  }, [id, fetchData]);

  const handleReserve = async () => {
    if (!user) {
      router.push('/auth/login');
      return;
    }

    // Geo-fence check
    if (navigator.geolocation) {
      const granted = await new Promise<boolean>((resolve) => {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            const dist = haversine(
              pos.coords.latitude, pos.coords.longitude,
              location.coordinates.lat, location.coordinates.lng
            );
            if (dist > 2) {
              toast.error(`You're ${dist.toFixed(1)} km away. Must be within 2 km to reserve.`);
              resolve(false);
            } else {
              resolve(true);
            }
          },
          () => resolve(true) // If location denied, allow anyway
        );
      });
      if (!granted) return;
    }

    setReserving(true);
    try {
      const res = await api.post('/api/reservations', { locationId: id });
      setActiveReservation(res.data.reservation);
      setShowQR(true);
      toast.success('Reservation created! Show your QR code at the gate.');
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to create reservation');
    } finally {
      setReserving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
        <UserNavbar />
        <div className="pt-24 max-w-3xl mx-auto px-4">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 dark:bg-gray-800 rounded-xl w-2/3" />
            <div className="h-4 bg-gray-100 dark:bg-gray-700 rounded-xl w-1/2" />
            <div className="h-48 bg-gray-100 dark:bg-gray-800 rounded-2xl" />
          </div>
        </div>
      </div>
    );
  }

  if (!location) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-600 dark:text-gray-300">Location not found</p>
          <Link href="/" className="text-blue-600 text-sm mt-2 block">← Back to map</Link>
        </div>
      </div>
    );
  }

  const cfg = STATUS_CONFIG[location.status as keyof typeof STATUS_CONFIG];
  const pct = location.totalSlots > 0 ? (location.availableSlots / location.totalSlots) * 100 : 0;
  const canReserve = location.status === 'available' && location.availableSlots > 0;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <UserNavbar />

      <div className="pt-20 max-w-3xl mx-auto px-4 py-6">
        <Link href="/" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-blue-600 mb-6 transition-colors">
          <ArrowLeft className="h-4 w-4" /> Back to Map
        </Link>

        {/* Header */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6 mb-4 shadow-sm">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">{location.name}</h1>
              <div className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400">
                <MapPin className="h-4 w-4" />
                <span>{location.address}</span>
              </div>
            </div>
            <span className={`inline-flex items-center px-4 py-1.5 rounded-full text-sm font-semibold border ${cfg.classes}`}>
              {cfg.label}
            </span>
          </div>

          {/* Stats */}
          <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Fee / Hour', value: location.hourlyFee ? `₹${location.hourlyFee}` : 'Free', color: 'text-blue-600 dark:text-blue-400' },
              { label: 'Total Spots', value: location.totalSlots, color: 'text-gray-900 dark:text-white' },
              { label: 'Available', value: location.availableSlots, color: 'text-emerald-600 dark:text-emerald-400' },
              { label: 'Occupied', value: location.totalSlots - location.availableSlots, color: 'text-red-600 dark:text-red-400' }
            ].map(({ label, value, color }) => (
              <div key={label} className="text-center p-3 bg-gray-50 dark:bg-gray-800 rounded-xl">
                <p className={`text-2xl font-bold ${color}`}>{value}</p>
                <p className="text-xs text-gray-500 mt-0.5">{label}</p>
              </div>
            ))}
          </div>

          <div className="mt-4 h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full ${pct > 50 ? 'bg-emerald-500' : pct > 25 ? 'bg-amber-500' : 'bg-red-500'}`}
              style={{ width: `${pct}%`, transition: 'width 0.5s ease' }}
            />
          </div>
        </div>

        {/* Slot Grid */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6 mb-4 shadow-sm">
          <h2 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Car className="h-5 w-5 text-blue-600" />
            Parking Slots
            <span className="text-xs text-gray-400 ml-auto">Live updates enabled</span>
          </h2>
          <SlotGrid slots={slots} />
        </div>

        {/* Reserve Button */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6 shadow-sm">
          {canReserve ? (
            <div>
              <div className="flex items-start gap-3 mb-4 p-3 bg-blue-50 dark:bg-blue-950 rounded-xl">
                <Shield className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-blue-900 dark:text-blue-300">Reservation Rules</p>
                  <p className="text-xs text-blue-600 dark:text-blue-400 mt-0.5">
                    Your spot is held for 15 minutes. You must be within 2 km to reserve.
                    QR code shown to attendant at entry.
                  </p>
                </div>
              </div>
              <button
                onClick={handleReserve}
                disabled={reserving || !!activeReservation}
                className="w-full py-4 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-bold rounded-xl transition-all text-base shadow-lg shadow-blue-200 dark:shadow-blue-900/30"
              >
                {!user 
                  ? 'Log in to Reserve' 
                  : reserving 
                    ? 'Reserving...' 
                    : activeReservation 
                      ? '✓ Reservation Active' 
                      : 'Reserve a Spot'}
              </button>
              {activeReservation && (
                <button
                  onClick={() => setShowQR(true)}
                  className="mt-2 w-full py-3 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 font-medium rounded-xl transition-all text-sm"
                >
                  Show QR Code
                </button>
              )}
            </div>
          ) : (
            <div className="text-center py-4">
              <AlertCircle className="h-10 w-10 text-red-400 mx-auto mb-2" />
              <p className="font-semibold text-gray-900 dark:text-white">
                {location.status === 'full' ? 'Parking Lot is Full' : 'Currently Unavailable'}
              </p>
              <p className="text-sm text-gray-500 mt-1">Please check back later or choose another location.</p>
            </div>
          )}
        </div>
      </div>

      {/* QR Modal */}
      {showQR && activeReservation && (
        <QRModal
          reservation={{ ...activeReservation, locationId: location }}
          onClose={() => setShowQR(false)}
        />
      )}
    </div>
  );
}
