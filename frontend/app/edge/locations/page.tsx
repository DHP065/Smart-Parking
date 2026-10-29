'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { Plus, Edit, Trash2, X, MapPin, Wifi } from 'lucide-react';

interface Location {
  _id: string; name: string; address: string;
  totalSlots: number; availableSlots: number;
  status: string; edgeServerId: string;
  hourlyFee?: number;
  coordinates: { lat: number; lng: number };
}

const emptyForm = {
  name: '', address: '', lat: '', lng: '',
  totalSlots: '', hourlyFee: '', edgeServerId: ''
};

export default function EdgeLocationsPage() {
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const fetchLocations = async () => {
    const res = await api.get('/api/parking');
    setLocations(res.data.locations || []);
    setLoading(false);
  };

  useEffect(() => { fetchLocations(); }, []);

  const openAdd = () => { setForm(emptyForm); setEditId(null); setShowModal(true); };
  const openEdit = (loc: Location) => {
    setForm({
      name: loc.name, address: loc.address,
      lat: String(loc.coordinates.lat), lng: String(loc.coordinates.lng),
      totalSlots: String(loc.totalSlots), hourlyFee: String(loc.hourlyFee || ''), edgeServerId: loc.edgeServerId || ''
    });
    setEditId(loc._id);
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.name || !form.address) { toast.error('Name and address are required'); return; }
    setSaving(true);
    try {
      const body = {
        name: form.name, address: form.address,
        coordinates: { lat: parseFloat(form.lat) || 0, lng: parseFloat(form.lng) || 0 },
        totalSlots: parseInt(form.totalSlots) || 0,
        availableSlots: parseInt(form.totalSlots) || 0,
        hourlyFee: parseFloat(form.hourlyFee as string) || 0,
        edgeServerId: form.edgeServerId,
        status: 'available'
      };
      if (editId) {
        await api.put(`/api/parking/${editId}`, body);
        toast.success('Location updated');
      } else {
        await api.post('/api/parking', body);
        toast.success('Location created');
      }
      setShowModal(false);
      fetchLocations();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this location and all its slots?')) return;
    try {
      await api.delete(`/api/parking/${id}`);
      toast.success('Location deleted');
      fetchLocations();
    } catch { toast.error('Failed to delete'); }
  };

  const STATUS_CFG: Record<string, string> = {
    available: 'text-emerald-600 bg-emerald-100 dark:text-emerald-400 dark:bg-emerald-950',
    full: 'text-red-600 bg-red-100 dark:text-red-400 dark:bg-red-950',
    reserved: 'text-amber-600 bg-amber-100 dark:text-amber-400 dark:bg-amber-950'
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Parking Locations</h1>
          <p className="text-sm text-gray-500 mt-1">{locations.length} locations registered</p>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-medium transition-colors shadow-sm"
        >
          <Plus className="h-4 w-4" /> Add Location
        </button>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr className="text-xs text-gray-500 uppercase tracking-wider">
                <th className="px-5 py-3 text-left">Name</th>
                <th className="px-5 py-3 text-left">Address</th>
                <th className="px-5 py-3 text-center">Slots</th>
                <th className="px-5 py-3 text-center">Available</th>
                <th className="px-5 py-3 text-center">Status</th>
                <th className="px-5 py-3 text-left">Edge Server</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {loading
                ? Array.from({ length: 4 }).map((_, i) => (
                    <tr key={i}><td colSpan={7} className="px-5 py-3"><div className="h-4 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" /></td></tr>
                  ))
                : locations.map(loc => (
                    <tr key={loc._id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                      <td className="px-5 py-3 font-medium text-gray-900 dark:text-white">{loc.name}</td>
                      <td className="px-5 py-3 text-gray-500 dark:text-gray-400 max-w-xs truncate">{loc.address}</td>
                      <td className="px-5 py-3 text-center text-gray-700 dark:text-gray-300">{loc.totalSlots}</td>
                      <td className="px-5 py-3 text-center text-emerald-600 dark:text-emerald-400 font-medium">{loc.availableSlots}</td>
                      <td className="px-5 py-3 text-center">
                        <span className={`text-xs font-medium px-2 py-1 rounded-full ${STATUS_CFG[loc.status] || ''}`}>
                          {loc.status}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-gray-500 text-xs font-mono">{loc.edgeServerId || '—'}</td>
                      <td className="px-5 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => openEdit(loc)}
                            className="p-1.5 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-950 text-gray-400 hover:text-blue-600 transition-colors"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(loc._id)}
                            className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950 text-gray-400 hover:text-red-600 transition-colors"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
              }
            </tbody>
          </table>
          {!loading && locations.length === 0 && (
            <div className="text-center py-12 text-gray-400">
              <MapPin className="h-10 w-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No locations yet. Add your first parking location.</p>
            </div>
          )}
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowModal(false)} />
          <div className="relative bg-white dark:bg-gray-900 w-full max-w-md mx-4 rounded-2xl shadow-2xl p-6 z-10">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">{editId ? 'Edit Location' : 'Add Location'}</h2>
              <button onClick={() => setShowModal(false)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>
            <div className="space-y-4">
              {[
                { label: 'Name', key: 'name', placeholder: 'Central Parking Complex' },
                { label: 'Address', key: 'address', placeholder: '123 Main St, City' },
                { label: 'Latitude', key: 'lat', placeholder: '28.6139' },
                { label: 'Longitude', key: 'lng', placeholder: '77.2090' },
                { label: 'Total Slots', key: 'totalSlots', placeholder: '50' },
                { label: 'Hourly Fee (₹)', key: 'hourlyFee', placeholder: '50' },
                { label: 'Edge Server ID (Leave empty to auto-generate)', key: 'edgeServerId', placeholder: 'edge-001' }
              ].map(({ label, key, placeholder }) => (
                <div key={key}>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">{label}</label>
                  <input
                    value={(form as any)[key]}
                    onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                    placeholder={placeholder}
                    className="w-full px-4 py-2.5 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              ))}
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowModal(false)} className="flex-1 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                Cancel
              </button>
              <button onClick={handleSave} disabled={saving} className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold transition-colors disabled:opacity-50">
                {saving ? 'Saving...' : editId ? 'Update' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
