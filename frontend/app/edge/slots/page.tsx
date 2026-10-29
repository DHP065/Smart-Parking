'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { toast } from 'sonner';
import { PenTool, Save, Trash2, Edit } from 'lucide-react';

export default function EdgeSlotsPage() {
  const [locationId, setLocationId] = useState('');
  const [locations, setLocations] = useState<any[]>([]);
  const [slots, setSlots] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Configuration Modal state
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ slotLabel: '', status: 'empty' });

  useEffect(() => {
    api.get('/api/parking').then(res => {
      setLocations(res.data.locations || []);
      if (res.data.locations?.length > 0) setLocationId(res.data.locations[0]._id);
    });
  }, []);

  useEffect(() => {
    if (!locationId) return;
    setLoading(true);
    api.get(`/api/slots/${locationId}`)
      .then(res => setSlots(res.data.slots || []))
      .finally(() => setLoading(false));
  }, [locationId]);

  const openAdd = () => { setForm({ slotLabel: '', status: 'empty' }); setEditId(null); setShowModal(true); };
  const openEdit = (s: any) => { setForm({ slotLabel: s.slotLabel, status: s.status }); setEditId(s._id); setShowModal(true); };

  const handleSave = async () => {
    if (!form.slotLabel) return toast.error('Label required');
    try {
      if (editId) {
        // Technically status updates happen in override mostly, but keeping it simple for configuration fallback
        await api.patch(`/api/slots/${editId}/status`, { status: form.status });
        toast.success('Updated');
      } else {
        // Create new is handled via configuring bulk. We'll simulate bulk config with one item.
        await api.post('/api/slots', {
          locationId,
          slots: [{
            slotLabel: form.slotLabel,
            polygonCoords: [
              { x: 10, y: 10 }, { x: 90, y: 10 }, { x: 90, y: 90 }, { x: 10, y: 90 } // Dummy square
            ],
            status: form.status
          }]
        });
        toast.success('Added slot (dummy polygon)');
      }
      setShowModal(false);
      api.get(`/api/slots/${locationId}`).then(res => setSlots(res.data.slots));
    } catch { toast.error('Failed to save'); }
  };

  const handleDelete = async (id: string) => {
    // Note: Backend doesn't have a specific DELETE /api/slots/:id route in original plan,
    // so we'll just show a toast for this mockup unless we add the route.
    toast.error('Deletion requires admin DB access in this version.');
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <PenTool className="h-6 w-6 text-blue-500" />
            Slot Configuration
          </h1>
          <p className="text-sm text-gray-500 mt-1">Manage physical slot definitions and metadata</p>
        </div>
        <select
          value={locationId}
          onChange={e => setLocationId(e.target.value)}
          className="px-4 py-2 bg-gray-900 border border-gray-800 text-white rounded-xl text-sm focus:border-blue-500 outline-none"
        >
          {locations.map(l => <option key={l._id} value={l._id}>{l.name}</option>)}
        </select>
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-2xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-800 flex justify-between items-center bg-gray-950">
          <h2 className="font-semibold text-white">Configured Slots ({slots.length})</h2>
          <button onClick={openAdd} className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium transition-colors">
            Add New Slot
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left text-gray-300">
            <thead className="bg-gray-800/50 text-xs uppercase text-gray-500">
              <tr>
                <th className="px-6 py-3">Label</th>
                <th className="px-6 py-3">ID</th>
                <th className="px-6 py-3">Current Status</th>
                <th className="px-6 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {loading ? (
                <tr><td colSpan={4} className="px-6 py-4 text-center text-gray-500">Loading...</td></tr>
              ) : slots.length === 0 ? (
                <tr><td colSpan={4} className="px-6 py-8 text-center text-gray-500">No slots configured for this location</td></tr>
              ) : (
                slots.map(s => (
                  <tr key={s._id} className="hover:bg-gray-800/30 transition-colors">
                    <td className="px-6 py-4 font-bold text-white">{s.slotLabel}</td>
                    <td className="px-6 py-4 font-mono text-xs text-gray-500">{s._id}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-sm text-xs font-semibold ${
                        s.status === 'occupied' ? 'bg-red-500/20 text-red-500 border border-red-500/30' :
                        s.status === 'reserved' ? 'bg-amber-500/20 text-amber-500 border border-amber-500/30' :
                        'bg-emerald-500/20 text-emerald-500 border border-emerald-500/30'
                      }`}>
                        {s.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => openEdit(s)} className="p-1.5 text-gray-400 hover:text-blue-500 hover:bg-gray-800 rounded-md transition-colors">
                          <Edit className="h-4 w-4" />
                        </button>
                        <button onClick={() => handleDelete(s._id)} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-gray-800 rounded-md transition-colors">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-gray-900 border border-gray-800 p-6 rounded-2xl w-full max-w-sm shadow-2xl">
            <h3 className="text-lg font-bold text-white mb-4">{editId ? 'Edit Configuration' : 'Add Slot'}</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Slot Label</label>
                <input
                  value={form.slotLabel} onChange={e => setForm({...form, slotLabel: e.target.value})}
                  className="w-full px-3 py-2 bg-black border border-gray-800 rounded-lg text-white focus:outline-none focus:border-blue-500"
                  placeholder="e.g. A-01"
                />
              </div>
              {editId && (
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Status Override</label>
                  <select
                    value={form.status} onChange={e => setForm({...form, status: e.target.value})}
                    className="w-full px-3 py-2 bg-black border border-gray-800 rounded-lg text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="empty">Empty</option>
                    <option value="occupied">Occupied</option>
                    <option value="reserved">Reserved</option>
                  </select>
                </div>
              )}
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowModal(false)} className="flex-1 py-2 border border-gray-700 text-gray-300 rounded-lg hover:bg-gray-800">Cancel</button>
              <button onClick={handleSave} className="flex-1 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500 flex justify-center items-center gap-2">
                <Save className="h-4 w-4" /> Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
