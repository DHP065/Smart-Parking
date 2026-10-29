'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';

export default function EdgeSidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  
  return (
    <aside className="h-screen w-64 fixed left-0 top-0 pt-20 bg-[#070e1d] flex flex-col border-r border-[#adc6ff]/10 z-40">
      <div className="px-6 mb-8">
        <div className="flex items-center gap-3 p-3 bg-[#151b2b] rounded-lg">
          <div className="w-10 h-10 bg-[#4d8eff]/20 rounded-sm flex items-center justify-center">
            <span className="material-symbols-outlined text-[#adc6ff]" style={{ fontVariationSettings: "'FILL' 1" }}>terminal</span>
          </div>
          <div>
            <h3 className="text-xs font-bold text-[#dce2f8]">Edge Node 01</h3>
            <p className="text-[10px] font-mono uppercase tracking-widest text-[#4edea3]">Terminal Active</p>
          </div>
        </div>
      </div>
      <nav className="flex-1 space-y-1">
        <Link href="/edge/monitor" className={`flex items-center gap-4 px-6 py-3 transition-all duration-200 ease-out ${pathname.includes('monitor') ? 'text-[#4edea3] border-r-2 border-[#4edea3] bg-[#4edea3]/5' : 'text-[#c2c6d6] hover:bg-[#adc6ff]/5'}`}>
          <span className="material-symbols-outlined">dashboard</span>
          <span className="font-mono text-sm uppercase tracking-wider">Dashboard</span>
        </Link>
        <Link href="/edge/locations" className="flex items-center gap-4 px-6 py-3 text-[#c2c6d6] hover:bg-[#adc6ff]/5 transition-all duration-200 ease-out">
          <span className="material-symbols-outlined">map</span>
          <span className="font-mono text-sm uppercase tracking-wider">Locations</span>
        </Link>
        <Link href="/edge/slots" className="flex items-center gap-4 px-6 py-3 text-[#c2c6d6] hover:bg-[#adc6ff]/5 transition-all duration-200 ease-out">
          <span className="material-symbols-outlined">sensors</span>
          <span className="font-mono text-sm uppercase tracking-wider">Sensors</span>
        </Link>
        <Link href="/edge/settings" className="flex items-center gap-4 px-6 py-3 text-[#c2c6d6] hover:bg-[#adc6ff]/5 transition-all duration-200 ease-out">
          <span className="material-symbols-outlined">settings</span>
          <span className="font-mono text-sm uppercase tracking-wider">Settings</span>
        </Link>
      </nav>
      <div className="p-6 mt-auto border-t border-[#adc6ff]/10">
        <button onClick={logout} className="w-full text-center text-error bg-error/10 border border-error/20 py-2 text-xs font-bold rounded-sm mb-4 hover:bg-error/20 transition-all font-mono">Sign Out</button>
        <div className="space-y-2">
          <a className="flex items-center gap-3 text-[#c2c6d6] text-xs font-mono uppercase tracking-widest hover:text-[#adc6ff]" href="#">
             <span className="material-symbols-outlined text-sm">help</span> Support
          </a>
        </div>
      </div>
    </aside>
  );
}
