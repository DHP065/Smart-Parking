'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { getSocket } from '@/lib/socket';
import { toast } from 'sonner';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';
import { format } from 'date-fns';

const COLORS = ['#adc6ff', '#4edea3', '#ffb786', '#8c909f'];

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    locations: 0, activeReservations: 0, totalUsers: 0, availablePct: 0, availableSlotsRaw: 0
  });
  const [barData, setBarData] = useState<any[]>([]);
  const [pieData, setPieData] = useState<any[]>([]);
  const [recentReservations, setRecentReservations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Edge Operator Connection
  const [edgeInput, setEdgeInput] = useState('');
  const [connectedEdge, setConnectedEdge] = useState<any>(null); // Location object
  const [isConnecting, setIsConnecting] = useState(false);

  const fetchDashboardData = async (edgeIdToConnect?: string | null, silent: boolean = false) => {
    if (!silent) setLoading(true);
    try {
      const [locRes, resRes, statsRes, userRes] = await Promise.all([
        api.get('/api/parking'),
        api.get('/api/reservations/all?limit=50'),
        api.get('/api/reservations/stats'),
        api.get('/api/auth/users')
      ]);

      const locations = locRes.data.locations || [];
      const reservations = resRes.data.reservations || [];
      
      const targetEdgeId = edgeIdToConnect !== undefined ? edgeIdToConnect : (typeof window !== 'undefined' ? localStorage.getItem('adminConnectedEdgeId') : null);

      if (targetEdgeId) {
        const edgeLocation = locations.find((l: any) => l.edgeServerId === targetEdgeId || l._id === targetEdgeId);
        
        if (edgeLocation) {
          const edgeReservations = reservations.filter((r: any) => r.locationId?._id === edgeLocation._id);
          
          setConnectedEdge(edgeLocation);
          setEdgeInput(edgeLocation.edgeServerId || edgeLocation._id);
          if (typeof window !== 'undefined') localStorage.setItem('adminConnectedEdgeId', edgeLocation.edgeServerId || edgeLocation._id);

          setStats({
            locations: 1,
            activeReservations: edgeReservations.filter((r: any) => r.status === 'active').length,
            totalUsers: userRes.data.users?.length || 0,
            availablePct: edgeLocation.totalSlots > 0 ? Math.round((edgeLocation.availableSlots / edgeLocation.totalSlots) * 100) : 0,
            availableSlotsRaw: edgeLocation.availableSlots
          });
          setRecentReservations(edgeReservations.slice(0, 8));
          if (!silent) setLoading(false);
          if (edgeIdToConnect && !silent) toast.success(`Connected to Edge Node: ${edgeLocation.name}`);
          return;
        } else {
           if (typeof window !== 'undefined') localStorage.removeItem('adminConnectedEdgeId');
           setConnectedEdge(null);
           setEdgeInput('');
           if (edgeIdToConnect) toast.error('No Edge Server found with that ID');
        }
      }

      // Global Stats
      setConnectedEdge(null);
      setEdgeInput('');
      if (typeof window !== 'undefined') localStorage.removeItem('adminConnectedEdgeId');

      const totalSlots = locations.reduce((s: number, l: any) => s + l.totalSlots, 0);
      const availableSlots = locations.reduce((s: number, l: any) => s + l.availableSlots, 0);

      setStats({
        locations: locations.length,
        activeReservations: reservations.filter((r: any) => r.status === 'active').length,
        totalUsers: userRes.data.users?.length || 0,
        availablePct: totalSlots > 0 ? Math.round((availableSlots / totalSlots) * 100) : 0,
        availableSlotsRaw: availableSlots
      });

      const dailyStats = statsRes.data.dailyStats || [];
      setBarData(dailyStats.map((d: any) => ({
        date: format(new Date(d._id), 'MMM d'),
        reservations: d.count
      })));

      const statusCounts = statsRes.data.statusCounts || [];
      setPieData(statusCounts.map((s: any) => ({
        name: s._id.charAt(0).toUpperCase() + s._id.slice(1),
        value: s.count
      })));

      setRecentReservations(reservations.slice(0, 8));
    } catch (err) {
      console.error('Dashboard fetch error', err);
    } finally {
      if (!silent) setLoading(false);
      setIsConnecting(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    const socket = getSocket();
    socket.connect();

    const handleRefresh = () => {
      fetchDashboardData(undefined, true);
    };

    socket.on('dashboard:refresh', handleRefresh);
    socket.on('lot:status', handleRefresh);

    return () => { 
      socket.off('dashboard:refresh', handleRefresh);
      socket.off('lot:status', handleRefresh);
      socket.disconnect(); 
    };
  }, []);

  useEffect(() => {
    if (!connectedEdge) return;

    const socket = getSocket();
    const handleLotStatus = (data: { locationId: string, availableSlots: number, totalSlots: number, status: string }) => {
      if (data.locationId === connectedEdge._id) {
        setStats(prev => ({
           ...prev,
           availableSlotsRaw: data.availableSlots,
           availablePct: data.totalSlots > 0 ? Math.round((data.availableSlots / data.totalSlots) * 100) : 0
        }));
      }
    };

    socket.emit('join:location', connectedEdge._id);
    socket.on('lot:status', handleLotStatus);

    return () => {
      socket.off('lot:status', handleLotStatus);
      socket.emit('leave:location', connectedEdge._id);
    };
  }, [connectedEdge]);

  const handleConnectEdge = () => {
    if (!edgeInput.trim()) return;
    setIsConnecting(true);
    fetchDashboardData(edgeInput);
  };

  return (
    <>
      {/* Top Bar */}
      <header className="h-20 flex justify-between items-center px-10 border-b border-[#2e3545]/15 bg-[#000000] z-30 sticky top-0">
        <div className="flex items-center gap-4">
          <h2 className="text-2xl font-black tracking-tighter text-[#adc6ff] uppercase">NOCTURNAL NAVIGATOR</h2>
          <div className="h-4 w-[1px] bg-outline-variant/30"></div>
          <span className="text-on-surface-variant font-medium tracking-tight">
            {connectedEdge ? (
               <span className="flex items-center gap-2"><span className="w-2.5 h-2.5 bg-secondary rounded-full animate-pulse" /> Edge Server Live View: {connectedEdge.name}</span>
            ) : 'Global Dashboard'}
          </span>
        </div>
        <div className="flex items-center gap-6">
          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <span className="material-symbols-outlined text-primary text-xl">search</span>
            </div>
            <input
              value={edgeInput}
              onChange={e => setEdgeInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleConnectEdge()}
              disabled={isConnecting || !!connectedEdge}
              className="w-72 bg-surface-container-high text-on-surface placeholder:text-on-surface-variant/40 rounded-xl border-none pl-12 pr-4 h-11 focus:ring-1 focus:ring-primary/30 focus:bg-surface-bright transition-all text-sm disabled:opacity-50"
              placeholder="Connect to Operator ID..."
              type="text"
            />
          </div>
          {connectedEdge ? (
             <button onClick={() => fetchDashboardData(null)} className="px-4 py-2 bg-error/10 hover:bg-error/20 text-error font-medium text-sm rounded-xl flex items-center gap-2 transition-colors border border-error/20">
                <span className="material-symbols-outlined text-sm">link_off</span> Disconnect
             </button>
          ) : (
             <button onClick={handleConnectEdge} disabled={isConnecting || !edgeInput.trim()} className="px-4 py-2 bg-primary/10 hover:bg-primary/20 text-primary font-medium text-sm rounded-xl flex items-center gap-2 transition-colors border border-primary/20 disabled:opacity-50">
                <span className="material-symbols-outlined text-sm">link</span> Connect
             </button>
          )}

          <div className="flex items-center gap-2">
            <button className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-[#323949]/40 text-on-surface-variant transition-all">
              <span className="material-symbols-outlined">notifications</span>
            </button>
            <div className="w-10 h-10 ml-2 rounded-xl border border-primary/20 p-0.5 bg-surface-container-high flex items-center justify-center">
              <span className="material-symbols-outlined text-primary">person</span>
            </div>
          </div>
        </div>
      </header>

      <div className="pt-8 pb-12 px-10 space-y-10">
        {/* KPI Cards Bento Grid */}
        <section className="grid grid-cols-4 gap-6">
          <div className="bg-surface-container-low p-6 rounded-xl shadow-[0_0_24px_rgba(173,198,255,0.08)] flex flex-col justify-between h-40">
            <div className="flex justify-between items-start">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                <span className="material-symbols-outlined">apartment</span>
              </div>
            </div>
            <div>
              <p className="text-on-surface-variant text-xs font-label uppercase tracking-widest mb-1">{connectedEdge ? 'Monitored Node' : 'Total Locations'}</p>
              <h3 className="text-3xl font-bold tracking-tight text-on-surface">{loading ? '—' : connectedEdge ? '1 (Live)' : stats.locations}</h3>
            </div>
          </div>

          <div className="bg-surface-container-low p-6 rounded-xl shadow-[0_0_24px_rgba(173,198,255,0.08)] flex flex-col justify-between h-40">
            <div className="flex justify-between items-start">
              <div className="w-10 h-10 rounded-lg bg-tertiary/10 flex items-center justify-center text-tertiary">
                <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>event_available</span>
              </div>
              <span className="text-xs font-bold text-tertiary px-2 py-1 rounded bg-tertiary/10">LIVE</span>
            </div>
            <div>
              <p className="text-on-surface-variant text-xs font-label uppercase tracking-widest mb-1">Active Reservations</p>
              <h3 className="text-3xl font-bold tracking-tight text-on-surface">{loading ? '—' : stats.activeReservations}</h3>
            </div>
          </div>

          <div className="bg-surface-container-low p-6 rounded-xl flex flex-col justify-between h-40">
            <div className="flex justify-between items-start">
              <div className="w-10 h-10 rounded-lg bg-surface-container-highest flex items-center justify-center text-on-surface">
                <span className="material-symbols-outlined">{connectedEdge ? 'directions_car' : 'group'}</span>
              </div>
            </div>
            <div>
              <p className="text-on-surface-variant text-xs font-label uppercase tracking-widest mb-1">{connectedEdge ? 'Live Available Slots' : 'Registered Users'}</p>
              <h3 className="text-3xl font-bold tracking-tight text-on-surface">{loading ? '—' : connectedEdge ? stats.availableSlotsRaw : stats.totalUsers}</h3>
            </div>
          </div>

          <div className="bg-surface-container-low p-6 rounded-xl shadow-[0_0_24px_rgba(78,222,163,0.08)] flex flex-col justify-between h-40">
            <div className="flex justify-between items-start">
              <div className="w-10 h-10 rounded-lg bg-secondary/10 flex items-center justify-center text-secondary">
                <span className="material-symbols-outlined">check_circle</span>
              </div>
              <div className="text-secondary flex items-center gap-1">
                <span className="material-symbols-outlined text-sm">trending_up</span>
                <span className="text-xs font-bold">Optimal</span>
              </div>
            </div>
            <div>
              <p className="text-on-surface-variant text-xs font-label uppercase tracking-widest mb-1">Availability %</p>
              <div className="flex items-end gap-3">
                <h3 className="text-3xl font-bold tracking-tight text-on-surface">{loading ? '—' : `${stats.availablePct}%`}</h3>
                <div className="flex-1 h-2 bg-surface-container-lowest rounded-full mb-2 overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-secondary to-secondary-container rounded-full" style={{ width: `${stats.availablePct}%` }}></div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Charts Section */}
        {!connectedEdge && (
          <section className="grid grid-cols-12 gap-8">
            <div className="col-span-8 bg-surface-container-low rounded-xl p-8 relative overflow-hidden">
              <div className="flex justify-between items-center mb-10">
                <div>
                  <h4 className="text-xl font-bold tracking-tight">Reservations - Last 7 Days</h4>
                  <p className="text-on-surface-variant text-sm">Global volume analytics across all hubs</p>
                </div>
              </div>
              <div className="h-64">
                {barData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={barData}>
                      <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#c2c6d6' }} axisLine={false} tickLine={false} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#191f2f', borderColor: '#2e3545', color: '#dce2f7', borderRadius: '12px' }} 
                        itemStyle={{ color: '#adc6ff' }}
                        cursor={{ fill: 'rgba(173,198,255,0.1)' }}
                      />
                      <Bar dataKey="reservations" fill="#adc6ff" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-on-surface-variant text-sm">No data yet</div>
                )}
              </div>
            </div>

            <div className="col-span-4 bg-surface-container-low rounded-xl p-8 flex flex-col">
              <h4 className="text-xl font-bold tracking-tight mb-2">Slot Distribution</h4>
              <p className="text-on-surface-variant text-sm mb-8">Capacity by status type</p>
              <div className="flex-1 flex flex-col items-center justify-center">
                {pieData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={240}>
                    <PieChart>
                      <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={4} dataKey="value" stroke="none">
                        {pieData.map((_, idx) => <Cell key={idx} fill={COLORS[idx % COLORS.length]} />)}
                      </Pie>
                      <Tooltip contentStyle={{ backgroundColor: '#191f2f', borderColor: '#2e3545', color: '#dce2f7', borderRadius: '12px' }} />
                      <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '12px', color: '#c2c6d6' }} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-48 flex items-center justify-center text-on-surface-variant text-sm">No data yet</div>
                )}
              </div>
            </div>
          </section>
        )}

        {/* Table Section */}
        <section className="space-y-6">
          <div className="flex justify-between items-end">
            <div>
              <h4 className="text-2xl font-bold tracking-tight">{connectedEdge ? 'Live Node Reservations' : 'Recent Global Reservations'}</h4>
              <p className="text-on-surface-variant">Real-time update stream from across the network</p>
            </div>
            <button className="text-primary font-semibold flex items-center gap-1 hover:underline transition-all">
              View Full History
              <span className="material-symbols-outlined text-sm">arrow_forward</span>
            </button>
          </div>
          <div className="bg-surface-container-low rounded-xl overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-container-highest/30">
                  <th className="px-8 py-5 text-[10px] uppercase tracking-[0.1em] font-label text-on-surface-variant font-bold">User Entity</th>
                  <th className="px-8 py-5 text-[10px] uppercase tracking-[0.1em] font-label text-on-surface-variant font-bold">Terminal Location</th>
                  <th className="px-8 py-5 text-[10px] uppercase tracking-[0.1em] font-label text-on-surface-variant font-bold">Timestamp</th>
                  <th className="px-8 py-5 text-[10px] uppercase tracking-[0.1em] font-label text-on-surface-variant font-bold">Session Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/10">
                {loading
                  ? Array.from({ length: 5 }).map((_, i) => (
                      <tr key={i}><td colSpan={4} className="px-8 py-5"><div className="h-4 bg-surface-container-highest rounded animate-pulse w-full max-w-md" /></td></tr>
                    ))
                  : recentReservations.map(r => {
                      const STATUS_CLS: Record<string, string> = {
                        active: 'bg-secondary/10 text-secondary border border-secondary/20',
                        expired: 'bg-outline-variant/30 text-outline border border-outline-variant/50',
                        used: 'bg-primary/10 text-primary border border-primary/20',
                        cancelled: 'bg-error/10 text-error border border-error/20'
                      };
                      return (
                        <tr key={r._id} className="hover:bg-surface-container-high transition-colors group">
                          <td className="px-8 py-5">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-full bg-surface-container-highest flex items-center justify-center text-on-surface font-bold text-xs">
                                {(r.userId?.displayName || r.userId?.email || 'U')[0].toUpperCase()}
                              </div>
                              <div>
                                <p className="text-sm font-semibold text-on-surface">{r.userId?.displayName || r.userId?.email || '—'}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-8 py-5">
                            <span className="text-sm font-medium text-on-surface">{r.locationId?.name || '—'}</span>
                          </td>
                          <td className="px-8 py-5">
                            <span className="text-sm text-on-surface-variant">{format(new Date(r.reservedAt), 'MMM d, h:mm a')}</span>
                          </td>
                          <td className="px-8 py-5">
                            <span className={`inline-flex items-center px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${STATUS_CLS[r.status] || STATUS_CLS.active}`}>
                              {r.status}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                }
                {!loading && recentReservations.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-8 py-8 text-center text-on-surface-variant text-sm">No reservations found</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      <button className="fixed bottom-10 right-10 w-14 h-14 rounded-full bg-gradient-to-br from-primary to-primary-container text-on-primary shadow-2xl flex items-center justify-center hover:scale-110 active:scale-95 transition-all z-50">
        <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>add</span>
      </button>
    </>
  );
}
