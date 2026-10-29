'use client';

import { useState, useEffect, useRef } from 'react';
import api from '@/lib/api';
import { connectSocket, joinLocationRoom, leaveLocationRoom } from '@/lib/socket';

export default function EdgeMonitorPage() {
  const [locationId, setLocationId] = useState<string>('');
  const [locations, setLocations] = useState<any[]>([]);
  const [slots, setSlots] = useState<any[]>([]);
  const [gridSize, setGridSize] = useState(4);
  const [isSimulating, setIsSimulating] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch managed locations
  useEffect(() => {
    api.get('/api/parking').then(res => {
      setLocations(res.data.locations || []);
      if (res.data.locations?.length > 0) {
        setLocationId(res.data.locations[0]._id);
      }
    });
  }, []);

  // Fetch slots and listen to socket
  useEffect(() => {
    if (!locationId) return;

    api.get(`/api/slots/${locationId}`).then(res => {
      setSlots(res.data.slots || []);
    });

    const socket = connectSocket();
    joinLocationRoom(locationId);

    socket.on('slot:update', ({ slotId, status }: { slotId: string, status: string }) => {
      setSlots(prev => prev.map(s => s._id === slotId ? { ...s, status } : s));
    });

    return () => {
      leaveLocationRoom(locationId);
      socket.off('slot:update');
    };
  }, [locationId]);

  const simulateDetection = async () => {
    if (!locationId || slots.length === 0) return;
    try {
      const activeSlots = slots.filter(s => s.status !== 'reserved');
      if (activeSlots.length === 0) return;
      const randomSlot = activeSlots[Math.floor(Math.random() * activeSlots.length)];
      const newStatus = Math.random() > 0.5 ? 'occupied' : 'empty';
      if (randomSlot.status !== newStatus) {
        await api.patch(`/api/slots/${randomSlot._id}/status`, { status: newStatus });
      }
    } catch (err) {
      console.error('Simulation error', err);
    }
  };

  useEffect(() => {
    if (isSimulating) {
      intervalRef.current = setInterval(simulateDetection, 2500);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isSimulating, locationId, slots]);

  return (
    <>
      <header className="bg-[#000000]/80 backdrop-blur-xl text-[#adc6ff] fixed top-0 left-0 right-0 z-50 flex justify-between items-center w-full px-6 h-16 shadow-[0_0_40px_rgba(173,198,255,0.1)] border-none">
        <div className="flex items-center gap-8">
          <span className="text-[#adc6ff] font-bold tracking-tighter text-xl ml-2 sm:ml-0">Live Monitor</span>
          <nav className="hidden md:flex gap-6 items-center">
            <span className="text-[#adc6ff] border-b-2 border-[#adc6ff] pb-1 font-semibold tracking-tight">Node Status</span>
            <span className="text-[#c2c6d6] hover:text-[#adc6ff] transition-colors font-semibold tracking-tight cursor-pointer">Analytics</span>
          </nav>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex bg-[#070e1d] px-2 py-1 rounded-sm gap-1">
            <button onClick={() => setGridSize(4)} className={`p-1 hover:bg-[#adc6ff]/10 transition-all duration-300 rounded ${gridSize===4?'text-[#adc6ff]':'text-[#c2c6d6]'}`}><span className="material-symbols-outlined text-sm">grid_view</span></button>
            <button onClick={() => setGridSize(2)} className={`p-1 hover:bg-[#adc6ff]/10 transition-all duration-300 rounded ${gridSize===2?'text-[#adc6ff]':'text-[#c2c6d6]'}`}><span className="material-symbols-outlined text-sm">window</span></button>
            <button onClick={() => setGridSize(1)} className={`p-1 hover:bg-[#adc6ff]/10 transition-all duration-300 rounded ${gridSize===1?'text-[#adc6ff]':'text-[#c2c6d6]'}`}><span className="material-symbols-outlined text-sm">crop_din</span></button>
          </div>
          <button 
             onClick={() => setIsSimulating(!isSimulating)}
             className={`px-4 py-1.5 rounded-sm font-semibold text-xs tracking-tight flex items-center gap-2 transition-all ${isSimulating ? 'bg-error text-white shadow-[0_0_15px_rgba(255,180,171,0.3)] hover:brightness-110 active:scale-95' : 'bg-[#00a572] text-[#00311f] shadow-[0_0_15px_rgba(78,222,163,0.3)] hover:brightness-110 active:scale-95'}`}
          >
            {isSimulating && <span className="w-2 h-2 rounded-full bg-white animate-pulse"></span>}
            {isSimulating ? 'Stop AI Traffic' : 'Start AI Traffic'}
          </button>
        </div>
      </header>
      
      <div className="p-6 h-[calc(100vh-104px)] overflow-hidden">
        {/* Header Controls */}
        <div className="flex justify-between items-end mb-6">
          <div>
            <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-[#8c909f]">Active Environment</span>
            <div className="flex items-center gap-4 mt-1">
              <h2 className="text-2xl font-bold tracking-tight text-[#dce2f8] bg-surface-container-low rounded-md">
                 <select value={locationId} onChange={e => setLocationId(e.target.value)} className="bg-transparent border-none text-xl font-bold p-1 focus:ring-0 cursor-pointer outline-none">
                    {locations.map(l => <option key={l._id} value={l._id} className="text-sm bg-[#000000]">{l.name}</option>)}
                    {locations.length === 0 && <option value="" disabled>Loading locations...</option>}
                 </select>
              </h2>
            </div>
          </div>
          <div className="flex gap-2">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-[#232a3a] rounded-sm text-[10px] font-mono border border-outline-variant/20">
              <span className={`w-2 h-2 rounded-full ${isSimulating ? 'bg-error' : 'bg-[#4edea3]'}`}></span>
              {isSimulating ? 'AI OVERRIDE ACTIVE' : 'AI INFERENCE IDLE'}
            </div>
          </div>
        </div>
        
        {/* Video Grid */}
        <div className={`grid gap-4 h-[calc(100%-80px)] ${gridSize === 4 ? 'grid-cols-2 grid-rows-2' : gridSize === 2 ? 'grid-cols-2 grid-rows-1' : 'grid-cols-1 grid-rows-1'}`}>
          {Array.from({ length: Math.max(1, gridSize) }).map((_, i) => (
             <div key={i} className="relative group overflow-hidden rounded-lg bg-[#070e1d] border border-[#424754]/20 flex flex-col justify-between">
                {/* Visual Video Fake */}
                <div className="absolute inset-0 bg-[#151b2b] opacity-60 pointer-events-none"></div>
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center opacity-5">
                    <span className="material-symbols-outlined text-9xl">linked_camera</span>
                </div>
                <div className="absolute inset-0 pointer-events-none" style={{ background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.02) 2px, rgba(255,255,255,0.02) 4px)' }}></div>
                
                <div className="absolute inset-0 p-4 flex flex-col justify-between z-10">
                   <div className="flex justify-between items-start">
                      <div className="bg-black/60 backdrop-blur-md p-2 rounded-sm border-l-2 border-[#adc6ff]">
                         <p className="text-[10px] font-mono uppercase text-[#adc6ff]">CAM-0{i+1}-VIEW</p>
                         <p className="text-[8px] font-mono text-[#8c909f]">POS: 40.7128° N, 74.0060° W</p>
                      </div>
                      <div className="bg-black/60 backdrop-blur-md px-2 py-1 rounded-sm flex items-center gap-1">
                         <span className="w-1.5 h-1.5 rounded-full bg-error animate-pulse"></span>
                         <p className="text-[10px] font-mono text-white">LIVE REC</p>
                      </div>
                   </div>
                   
                   {/* Slots Overlay */}
                   <div className="flex-1 relative mt-4 overflow-hidden">
                      {slots.length > 0 && i === 0 && (
                         <div className="absolute inset-0 flex flex-wrap gap-2 content-start overflow-y-auto pr-2 pb-8">
                            {slots.map((s, idx) => (
                               <div key={s._id} className={`p-1.5 border-2 ${s.status === 'empty' ? 'border-[#4edea3]/50 bg-[#4edea3]/10' : s.status === 'occupied' ? 'border-[#ffb4ab]/50 bg-[#ffb4ab]/10' : 'border-[#adc6ff]/50 bg-[#adc6ff]/10'}`}>
                                  <span className={`text-[8px] font-mono px-1 block ${s.status === 'empty' ? 'bg-[#4edea3] text-[#003824]' : s.status === 'occupied' ? 'bg-[#ffb4ab] text-white' : 'bg-[#adc6ff] text-[#001a42]'}`}>SLOT_{s.slotNumber || idx} [{s.status.toUpperCase()}]</span>
                               </div>
                            ))}
                         </div>
                      )}
                      {(slots.length === 0 || i !== 0) && (
                          <div className="absolute inset-0 flex items-center justify-center flex-col gap-2">
                            <span className="material-symbols-outlined text-[#8c909f] text-4xl">sensors_off</span>
                            <p className="text-[10px] font-mono uppercase text-[#8c909f] tracking-widest">{i === 0 ? 'NO SENSORS MAPPED' : 'NO DATA FEED'}</p>
                          </div>
                      )}
                   </div>
                   
                   <div className="flex gap-2">
                      <div className="backdrop-blur-md bg-[#151b2b]/70 px-3 py-1 rounded-sm border border-[#4edea3]/30">
                         <p className="text-[10px] font-mono text-[#4edea3]">CAPACITY: {slots.length > 0 ? Math.round((slots.filter(s => s.status === 'occupied' || s.status === 'reserved').length / slots.length) * 100) : 0}%</p>
                      </div>
                   </div>
                </div>
             </div>
          ))}
        </div>
      </div>
      
      {/* Footer */}
      <footer className="bg-[#070e1d]/90 backdrop-blur-md text-[#4edea3] fixed bottom-0 w-full h-10 flex items-center border-t border-[#adc6ff]/10 shadow-[0_-4px_20px_rgba(0,0,0,0.5)] z-50 px-8 justify-between left-0">
        <div className="flex gap-8 items-center pl-64">
           <span className="font-mono text-[9px] sm:text-[11px] uppercase tracking-[0.1em]">System Status: Optimal | Kinetic Intelligence v4.0</span>
        </div>
        <div className="hidden sm:flex gap-12 items-center">
           <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[14px]">speed</span>
              <span className="font-mono text-[11px] uppercase tracking-[0.1em] text-[#4edea3] font-bold">Inference: 24ms</span>
           </div>
           <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[14px]">motion_photos_on</span>
              <span className="font-mono text-[11px] uppercase tracking-[0.1em] text-[#c2c6d6]">Frames: 30fps</span>
           </div>
           <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[14px]">view_module</span>
              <span className="font-mono text-[11px] uppercase tracking-[0.1em] text-[#c2c6d6]">Total Slots Visible: {slots.length}</span>
           </div>
        </div>
      </footer>
    </>
  );
}
