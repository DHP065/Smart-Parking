'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { toast } from 'sonner';
import { AlertOctagon, CheckCircle2 } from 'lucide-react';
import { connectSocket, joinLocationRoom, leaveLocationRoom } from '@/lib/socket';

export default function EdgeOverridePage() {
  const [locationId, setLocationId] = useState('');
  const [locations, setLocations] = useState<any[]>([]);
  const [slots, setSlots] = useState<any[]>([]);

  useEffect(() => {
    api.get('/api/parking').then(res => {
      setLocations(res.data.locations || []);
      if (res.data.locations?.length > 0) setLocationId(res.data.locations[0]._id);
    });
  }, []);

  useEffect(() => {
    if (!locationId) return;
    api.get(`/api/slots/${locationId}`).then(res => setSlots(res.data.slots || []));

    const socket = connectSocket();
    joinLocationRoom(locationId);
    socket.on('slot:update', ({ slotId, status }) => {
      setSlots(prev => prev.map(s => s._id === slotId ? { ...s, status } : s));
    });

    return () => {
      leaveLocationRoom(locationId);
      socket.off('slot:update');
    };
  }, [locationId]);

  const setStatus = async (slotId: string, status: string) => {
    try {
      await api.patch(`/api/slots/${slotId}/status`, { status });
      toast.success(`Slot forced to ${status}`);
    } catch {
      toast.error('Failed to override slot');
    }
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <AlertOctagon className="h-6 w-6 text-amber-500" />
            Manual Override
          </h1>
          <p className="text-sm text-gray-500 mt-1">Force update slot statuses instantly bypassing ML inference</p>
        </div>
        <select
          value={locationId}
          onChange={e => setLocationId(e.target.value)}
          className="px-4 py-2 bg-gray-900 border border-gray-800 text-white rounded-xl text-sm focus:border-amber-500 outline-none"
        >
          {locations.map(l => <option key={l._id} value={l._id}>{l.name}</option>)}
        </select>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-4">
        {slots.map(s => {
          const isEmpty = s.status === 'empty';
          const isOcc = s.status === 'occupied';
          const isRes = s.status === 'reserved';

          return (
            <div key={s._id} className={`p-4 rounded-xl border flex flex-col items-center justify-center text-center transition-all ${
              isEmpty ? 'bg-emerald-500/10 border-emerald-500/20' :
              isOcc ? 'bg-red-500/10 border-red-500/20' :
              'bg-amber-500/10 border-amber-500/20'
            }`}>
              <h3 className="text-xl font-bold text-white mb-3">{s.slotLabel}</h3>

              <div className="flex flex-col gap-2 w-full">
                <button
                  onClick={() => setStatus(s._id, 'empty')}
                  disabled={isEmpty}
                  className={`py-1.5 text-xs font-bold rounded flex items-center justify-center gap-1 ${
                    isEmpty ? 'bg-emerald-600 text-white cursor-default' : 'bg-gray-800 text-gray-400 hover:bg-emerald-600 hover:text-white transition-colors'
                  }`}
                >
                  {isEmpty && <CheckCircle2 className="h-3 w-3" />} Empty
                </button>
                <button
                  onClick={() => setStatus(s._id, 'occupied')}
                  disabled={isOcc}
                  className={`py-1.5 text-xs font-bold rounded flex items-center justify-center gap-1 ${
                    isOcc ? 'bg-red-600 text-white cursor-default' : 'bg-gray-800 text-gray-400 hover:bg-red-600 hover:text-white transition-colors'
                  }`}
                >
                  {isOcc && <CheckCircle2 className="h-3 w-3" />} Occupied
                </button>
                <button
                  onClick={() => setStatus(s._id, 'reserved')}
                  disabled={isRes}
                  className={`py-1.5 text-xs font-bold rounded flex items-center justify-center gap-1 ${
                    isRes ? 'bg-amber-600 text-white cursor-default' : 'bg-gray-800 text-gray-400 hover:bg-amber-600 hover:text-white transition-colors'
                  }`}
                >
                  {isRes && <CheckCircle2 className="h-3 w-3" />} Reserved
                </button>
              </div>
            </div>
          );
        })}
        {slots.length === 0 && (
          <div className="col-span-full py-12 text-center text-gray-500">
            No slots to display. Try configuring some first.
          </div>
        )}
      </div>
    </div>
  );
}
