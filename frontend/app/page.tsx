'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import UserNavbar from '@/components/shared/UserNavbar';
import api from '@/lib/api';
import { connectSocket } from '@/lib/socket';
import { MapPin, Car, Search, Navigation, ChevronRight, TrendingUp } from 'lucide-react';

const ParkingMap = dynamic(() => import('@/components/map/ParkingMap'), { ssr: false });

interface Location {
  _id: string;
  name: string;
  address: string;
  coordinates: { lat: number; lng: number };
  availableSlots: number;
  totalSlots: number;
  status: 'available' | 'full' | 'reserved';
  hourlyFee?: number;
}

const STATUS_CONFIG = {
  available: { label: 'Available', color: 'text-emerald-600 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-950', dot: 'bg-emerald-500' },
  full: { label: 'Full', color: 'text-red-600 bg-red-50 dark:text-red-400 dark:bg-red-950', dot: 'bg-red-500' },
  reserved: { label: 'Reserved', color: 'text-amber-600 bg-amber-50 dark:text-amber-400 dark:bg-amber-950', dot: 'bg-amber-500' }
};

export default function HomePage() {
  const [locations, setLocations] = useState<Location[]>([]);
  const [filtered, setFiltered] = useState<Location[]>([]);
  const [search, setSearch] = useState('');
  const [userPos, setUserPos] = useState<[number, number]>([28.6139, 77.2090]);
  const [hasLocation, setHasLocation] = useState(false);
  const [viewMode, setViewMode] = useState<'map' | 'list'>('map');
  const [loading, setLoading] = useState(true);
  const [locating, setLocating] = useState(true);

  useEffect(() => {
    api.get('/api/parking').then(res => {
      setLocations(res.data.locations || []);
      setFiltered(res.data.locations || []);
    }).finally(() => setLoading(false));

    // Try geolocation with a hard fallback timeout so the map doesn't get stuck loading
    // if the user ignores the permission prompt.
    const fallbackTimeoutId = setTimeout(() => {
      setLocating(false);
    }, 2500);

    if (typeof navigator !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        pos => {
          clearTimeout(fallbackTimeoutId);
          setUserPos([pos.coords.latitude, pos.coords.longitude]);
          setHasLocation(true);
          setLocating(false);
        },
        err => {
          clearTimeout(fallbackTimeoutId);
          console.warn("Geolocation warning:", err.message);
          if (window.location.hostname !== 'localhost') {
            setHasLocation(true); // fallback to initial userPos
            import('sonner').then(({ toast }) => {
              toast.info("Using mock location (mobile browsers require HTTPS for real location).");
            });
          } else {
             // Let the user know why their location didn't show up on localhost
             import('sonner').then(({ toast }) => {
               toast.error("Could not fetch location. Please check browser permissions.");
             });
          }
          setLocating(false);
        },
        { timeout: 5000 } // Removed enableHighAccuracy to speed up TTFF
      );
    } else {
       clearTimeout(fallbackTimeoutId);
       if (typeof window !== 'undefined' && window.location.hostname !== 'localhost') {
         setHasLocation(true);
         import('sonner').then(({ toast }) => {
           toast.info("Using mock location (mobile browsers require HTTPS for real location).");
         });
       }
       setLocating(false);
    }

    // Socket.IO for global lot status updates
    const socket = connectSocket();

    const handleLotStatus = ({ locationId, status, availableSlots }: any) => {
      setLocations(prev => prev.map(loc => 
        loc._id === locationId ? { ...loc, status, availableSlots } : loc
      ));
    };

    socket.on('lot:status', handleLotStatus);

    return () => {
      socket.off('lot:status', handleLotStatus);
    };
  }, []);

  useEffect(() => {
    const q = search.toLowerCase();
    setFiltered(
      q ? locations.filter(l =>
        l.name.toLowerCase().includes(q) ||
        l.address.toLowerCase().includes(q)
      ) : locations
    );
  }, [search, locations]);

  return (
    <div className="min-h-screen bg-background text-on-background">
      <UserNavbar />

      <main className="max-w-[1920px] mx-auto px-4 sm:px-8 pt-24 pb-10 flex flex-col gap-10">
        
        {/* Mobile Toggle & Search */}
        <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center -mt-4 mb-2">
          {/* Search */}
          <div className="relative w-full md:max-w-md group">
            <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-primary">search</span>
            <input
              type="text"
              placeholder="Search by destination or garage name..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full bg-surface-container-high rounded-xl py-3 pl-12 pr-4 border border-outline-variant/30 focus:border-primary focus:ring-1 focus:ring-primary/30 transition-all text-on-surface placeholder:text-on-surface-variant/50 outline-none"
            />
          </div>
          {/* Toggle */}
          <div className="flex w-full md:w-auto p-1 bg-surface-container-high rounded-xl lg:hidden">
            {(['map', 'list'] as const).map(mode => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={`flex-1 md:flex-none px-6 py-2 rounded-lg text-sm font-bold capitalize transition-all ${
                  viewMode === mode
                    ? 'bg-primary text-on-primary shadow-md'
                    : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-bright'
                }`}
              >
                {mode === 'map' ? 'Map View' : 'List View'}
              </button>
            ))}
          </div>
        </div>

        {/* Hero Section */}
        <section className="flex flex-col gap-3">
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-on-background">
            Find & Reserve <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-secondary">Parking Near You</span>
          </h1>
          <p className="text-on-surface-variant text-base md:text-lg max-w-2xl font-light leading-relaxed">
            Experience the future of urban transit. Secure high-end parking slots in real-time with precise location tracking and instant mobile reservation.
          </p>
        </section>

        {/* Stats Dashboard */}
        <section className="grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-6">
          <div className="glass-panel p-5 md:p-6 rounded-xl border border-outline-variant/10 group hover:border-primary/30 transition-all">
            <div className="flex justify-between items-start mb-4">
              <div className="p-2.5 md:p-3 rounded-lg bg-primary/10 text-primary">
                <span className="material-symbols-outlined">local_parking</span>
              </div>
              <span className="text-[10px] md:text-xs font-bold uppercase tracking-widest text-on-surface-variant/60">Real-time</span>
            </div>
            <div className="flex flex-col">
              <span className="text-3xl md:text-4xl font-black tracking-tighter text-on-surface mb-1">
                {filtered.filter(l => l.status === 'available').length}
              </span>
              <span className="text-xs md:text-sm text-on-surface-variant font-medium">Available Sites</span>
            </div>
            <div className="mt-4 h-1 w-full bg-surface-container-lowest rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-primary to-primary-container" style={{ width: '72%' }}></div>
            </div>
          </div>
          
          <div className="glass-panel p-5 md:p-6 rounded-xl border border-outline-variant/10 group hover:border-secondary/30 transition-all">
            <div className="flex justify-between items-start mb-4">
              <div className="p-2.5 md:p-3 rounded-lg bg-secondary/10 text-secondary">
                <span className="material-symbols-outlined">event_available</span>
              </div>
              <span className="text-[10px] md:text-xs font-bold uppercase tracking-widest text-on-surface-variant/60">Live Status</span>
            </div>
            <div className="flex flex-col">
              <span className="text-3xl md:text-4xl font-black tracking-tighter text-on-surface mb-1">
                {filtered.reduce((s, l) => s + l.availableSlots, 0)}
              </span>
              <span className="text-xs md:text-sm text-on-surface-variant font-medium">Total Free Spots</span>
            </div>
            <div className="mt-4 h-1 w-full bg-surface-container-lowest rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-secondary to-secondary-container" style={{ width: '45%' }}></div>
            </div>
          </div>

          <div className="glass-panel p-5 md:p-6 rounded-xl border border-outline-variant/10 group hover:border-tertiary/30 transition-all">
            <div className="flex justify-between items-start mb-4">
              <div className="p-2.5 md:p-3 rounded-lg bg-tertiary/10 text-tertiary">
                <span className="material-symbols-outlined">explore</span>
              </div>
              <span className="text-[10px] md:text-xs font-bold uppercase tracking-widest text-on-surface-variant/60">Within 2km</span>
            </div>
            <div className="flex flex-col">
              <span className="text-3xl md:text-4xl font-black tracking-tighter text-on-surface mb-1">
                {filtered.length}
              </span>
              <span className="text-xs md:text-sm text-on-surface-variant font-medium">Nearby Locations</span>
            </div>
            <div className="mt-4 flex items-center gap-2">
              <span className="flex -space-x-2">
                <div className="w-6 h-6 rounded-full border-2 border-surface bg-surface-variant flex items-center justify-center text-[8px]">U</div>
                <div className="w-6 h-6 rounded-full border-2 border-surface bg-primary-container flex items-center justify-center text-[8px]">P</div>
              </span>
              <span className="text-[10px] text-on-surface-variant font-bold uppercase tracking-tighter">+ active now</span>
            </div>
          </div>
        </section>

        {/* Split Layout: Map & List */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:h-[700px]">
          {/* Left Side: Interactive Map */}
          <div className={`lg:col-span-8 relative rounded-2xl overflow-hidden bg-surface-container-low border border-outline-variant/10 min-h-[500px] ${viewMode === 'list' ? 'hidden lg:block' : ''}`}>
            {loading || locating ? (
                <div className="absolute inset-0 z-10 bg-surface-container-low/50 backdrop-blur-sm animate-pulse flex items-center justify-center">
                  <div className="flex flex-col items-center opacity-80">
                    <span className="material-symbols-outlined text-4xl text-primary mb-2 animate-bounce">location_on</span>
                    <p className="text-sm font-medium text-primary">Loading Map...</p>
                  </div>
                </div>
            ) : (
              <ParkingMap
                locations={filtered}
                center={userPos}
                userLocation={hasLocation ? userPos : undefined}
              />
            )}
          </div>

          {/* Right Side: Scrollable List */}
          <div className={`lg:col-span-4 flex flex-col gap-4 overflow-y-auto pr-2 custom-scrollbar ${viewMode === 'map' ? 'hidden lg:flex' : 'flex'}`}>
            <div className="flex justify-between items-center mb-2 px-1">
              <h3 className="font-bold text-lg text-on-background">Nearby Parking</h3>
              <span className="text-xs font-bold text-primary flex items-center gap-1 cursor-pointer hover:text-primary-block transition-colors">
                <span className="material-symbols-outlined text-sm">tune</span> Filter
              </span>
            </div>

            {loading ? (
              Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)
            ) : filtered.length === 0 ? (
              <div className="text-center py-16 text-on-surface-variant">
                <span className="material-symbols-outlined text-5xl opacity-40 mb-3">car_crash</span>
                <p className="text-lg font-medium text-on-surface">No locations found</p>
                <p className="text-sm mt-1">Try adjusting your search</p>
              </div>
            ) : (
              filtered.map(loc => <LocationCard key={loc._id} loc={loc} />)
            )}
          </div>
        </section>
      </main>
    </div>
  );
}

function LocationCard({ loc }: { loc: Location }) {
  const pct = loc.totalSlots > 0 ? (loc.availableSlots / loc.totalSlots) * 100 : 0;
  
  // Choose accent color based on availability
  const isHigh = pct > 50;
  const isMed = pct > 15 && pct <= 50;
  const isLow = pct <= 15;
  
  const cardBorderActive = isHigh ? 'hover:border-primary/40' : (isLow ? 'hover:border-tertiary/40' : 'hover:border-secondary/40');
  const accentText = isHigh ? 'text-primary' : (isLow ? 'text-tertiary' : 'text-secondary');
  const barGradient = isHigh ? 'from-primary to-primary-container' : (isLow ? 'from-error to-error-container' : 'from-secondary to-secondary-container');
  const btnBg = isLow ? 'bg-surface-container-highest cursor-not-allowed opacity-50 text-on-surface-variant' : (isHigh ? 'bg-primary text-on-primary hover:brightness-110' : 'bg-secondary text-on-secondary hover:brightness-110');

  return (
    <Link href={`/parking/${loc._id}`} className="group block">
      <div className={`p-5 rounded-xl bg-surface-container-high border border-outline-variant/10 ${cardBorderActive} transition-all flex flex-col gap-4`}>
        <div className="flex justify-between items-start">
          <div className="pr-4">
            <h4 className="font-bold text-lg text-on-surface tracking-tight group-hover:text-primary transition-colors">{loc.name}</h4>
            <p className="text-sm text-on-surface-variant line-clamp-1">{loc.address}</p>
            {loc.hourlyFee !== undefined && loc.hourlyFee > 0 && (
              <p className="text-sm font-semibold text-primary mt-1">₹{loc.hourlyFee} / hr</p>
            )}
          </div>
          <span className={`text-xl font-black ${accentText}`}>
            {loc.status === 'full' ? 'FULL' : `${loc.availableSlots}`}
            {loc.status !== 'full' && <span className="text-xs font-medium text-on-surface-variant"> slots</span>}
          </span>
        </div>
        
        <div className="flex flex-col gap-2">
          <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-wider text-on-surface-variant/70">
            <span>Availability</span>
            <span className={accentText}>{Math.round(pct)}% Free</span>
          </div>
          <div className="h-2 w-full bg-surface-container-lowest rounded-full overflow-hidden">
            <div className={`h-full bg-gradient-to-r ${barGradient} transition-all duration-500`} style={{ width: `${Math.max(pct, 5)}%` }}></div>
          </div>
        </div>
        
        <div className="flex items-center gap-2 mt-2">
          <button className={`flex-1 py-2.5 rounded-lg font-bold text-sm active:scale-95 transition-all ${btnBg}`}>
            {loc.status === 'full' ? 'Currently Full' : 'Reserve Now'}
          </button>
          <button className="p-2.5 rounded-lg bg-surface-container-highest text-on-surface-variant hover:text-on-surface transition-colors flex items-center justify-center">
            <span className="material-symbols-outlined text-sm">directions</span>
          </button>
        </div>
      </div>
    </Link>
  );
}

function SkeletonCard() {
  return (
    <div className="p-5 rounded-xl bg-surface-container-high border border-outline-variant/10 animate-pulse flex flex-col gap-4">
      <div className="flex justify-between items-start">
        <div className="w-2/3">
          <div className="h-5 bg-surface-variant rounded w-full mb-2" />
          <div className="h-3 bg-surface-container-highest rounded w-3/4" />
        </div>
        <div className="h-6 w-12 bg-surface-variant rounded" />
      </div>
      <div className="flex flex-col gap-2">
        <div className="h-3 bg-surface-variant rounded w-full opacity-50" />
      </div>
      <div className="flex items-center gap-2 mt-2">
        <div className="flex-1 h-10 bg-surface-variant rounded-lg" />
        <div className="w-10 h-10 bg-surface-variant rounded-lg" />
      </div>
    </div>
  );
}
