'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { X, ChevronLeft, ChevronRight, QrCode } from 'lucide-react';
import QRScannerModal from '@/components/reservation/QRScannerModal';

const STATUS_CONFIG: Record<string, string> = {
  active: 'text-emerald-700 bg-emerald-100 dark:text-emerald-400 dark:bg-emerald-950',
  expired: 'text-gray-600 bg-gray-100 dark:text-gray-400 dark:bg-gray-800',
  used: 'text-blue-700 bg-blue-100 dark:text-blue-400 dark:bg-blue-950',
  cancelled: 'text-red-600 bg-red-100 dark:text-red-400 dark:bg-red-950'
};

export default function AdminReservationsPage() {
  const [reservations, setReservations] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [filterStatus, setFilterStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [scannerType, setScannerType] = useState<'entry' | 'exit'>('entry');
  const limit = 15;
  const [isInitializing, setIsInitializing] = useState(true);
  const [filterLocationId, setFilterLocationId] = useState<string | null>(null);
  const [connectedEdgeName, setConnectedEdgeName] = useState<string | null>(null);

  useEffect(() => {
    const initEdge = async () => {
      const savedEdgeId = typeof window !== 'undefined' ? localStorage.getItem('adminConnectedEdgeId') : null;
      if (savedEdgeId) {
        try {
          const locRes = await api.get('/api/parking');
          const edgeLoc = locRes.data.locations?.find((l:any) => l.edgeServerId === savedEdgeId || l._id === savedEdgeId);
          if (edgeLoc) {
            setFilterLocationId(edgeLoc._id);
            setConnectedEdgeName(edgeLoc.name);
          }
        } catch {}
      }
      setIsInitializing(false);
    };
    initEdge();
  }, []);

  const fetchReservations = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(limit) });
      if (filterStatus) params.append('status', filterStatus);
      if (filterLocationId) params.append('locationId', filterLocationId);
      const res = await api.get(`/api/reservations/all?${params}`);
      setReservations(res.data.reservations || []);
      setTotal(res.data.total || 0);
    } catch { toast.error('Failed to load reservations'); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    if (!isInitializing) fetchReservations();
  }, [page, filterStatus, filterLocationId, isInitializing]);

  const handleCancel = async (id: string) => {
    if (!confirm('Cancel this reservation?')) return;
    try {
      await api.patch(`/api/reservations/${id}/cancel`);
      toast.success('Reservation cancelled');
      fetchReservations();
    } catch (err: any) { toast.error(err.response?.data?.error || 'Failed'); }
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="p-6">
      <div className="flex items-center justify-between gap-4 flex-wrap mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            Reservations
            {connectedEdgeName && (
              <span className="text-[13px] font-medium text-emerald-700 bg-emerald-100 dark:text-emerald-400 dark:bg-emerald-900/40 px-3 py-1 rounded-full flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                Live: {connectedEdgeName}
              </span>
            )}
          </h1>
          <p className="text-sm text-gray-500 mt-1">{total} total reservations</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => { setScannerType('entry'); setIsScannerOpen(true); }}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-colors flex items-center gap-2 text-sm shadow-sm"
          >
            <QrCode className="h-4 w-4" />
            Verify Entry
          </button>
          <button
            onClick={() => { setScannerType('exit'); setIsScannerOpen(true); }}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-medium transition-colors flex items-center gap-2 text-sm shadow-sm"
          >
            <QrCode className="h-4 w-4" />
            Verify Exit
          </button>
          <select
            value={filterStatus}
            onChange={e => { setFilterStatus(e.target.value); setPage(1); }}
            className="px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Statuses</option>
            <option value="active">Active</option>
            <option value="used">Used</option>
            <option value="expired">Expired</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr className="text-xs text-gray-500 uppercase tracking-wider">
                <th className="px-5 py-3 text-left">User</th>
                <th className="px-5 py-3 text-left">Location</th>
                <th className="px-5 py-3 text-left">Reserved At</th>
                <th className="px-5 py-3 text-left">Expires At</th>
                <th className="px-5 py-3 text-center">Status</th>
                <th className="px-5 py-3 text-left">QR Token</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {loading
                ? Array.from({ length: 8 }).map((_, i) => (
                    <tr key={i}><td colSpan={7} className="px-5 py-3"><div className="h-4 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" /></td></tr>
                  ))
                : reservations.map(r => (
                    <tr key={r._id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                      <td className="px-5 py-3">
                        <div className="font-medium text-gray-900 dark:text-white">{r.userId?.displayName || '—'}</div>
                        <div className="text-xs text-gray-400">{r.userId?.email || ''}</div>
                      </td>
                      <td className="px-5 py-3 text-gray-600 dark:text-gray-300">{r.locationId?.name || '—'}</td>
                      <td className="px-5 py-3 text-gray-500 text-xs">
                        {format(new Date(r.reservedAt), 'MMM d, h:mm a')}
                      </td>
                      <td className="px-5 py-3 text-gray-500 text-xs">
                        {format(new Date(r.expiresAt), 'MMM d, h:mm a')}
                      </td>
                      <td className="px-5 py-3 text-center">
                        <span className={`text-xs font-medium px-2 py-1 rounded-full ${STATUS_CONFIG[r.status]}`}>
                          {r.status}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <code className="text-xs text-gray-400 font-mono">
                          {r.qrToken?.slice(0, 8)}…
                        </code>
                      </td>
                      <td className="px-5 py-3 text-right">
                        {r.status === 'active' && (
                          <button
                            onClick={() => handleCancel(r._id)}
                            className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950 text-gray-400 hover:text-red-600 transition-colors"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
              }
            </tbody>
          </table>
          {!loading && reservations.length === 0 && (
            <div className="text-center py-10 text-gray-400 text-sm">No reservations found</div>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-4 border-t border-gray-100 dark:border-gray-800">
            <span className="text-xs text-gray-500">Page {page} of {totalPages}</span>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-40 transition-colors"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-40 transition-colors"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      <QRScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onVerifySuccess={fetchReservations}
        scanType={scannerType}
        locationId={filterLocationId}
      />
    </div>
  );
}
