'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';

const navItems = [
  { href: '/admin/dashboard', label: 'Global Overview', icon: 'dashboard' },
  { href: '/admin/reservations', label: 'Reservations Analytics', icon: 'map' },
  { href: '/admin/users', label: 'User Directory', icon: 'group' },
  { href: '/admin/settings', label: 'System Settings', icon: 'settings' },
];

export default function AdminSidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  return (
    <aside className="h-screen w-64 fixed left-0 top-0 z-40 flex flex-col border-r border-[#2e3545]/15 bg-[#000000] font-body font-medium text-sm antialiased">
      <div className="px-8 py-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary-container flex items-center justify-center">
            <span className="material-symbols-outlined text-on-primary-fixed" style={{ fontVariationSettings: "'FILL' 1" }}>local_parking</span>
          </div>
          <div>
            <h1 className="text-lg font-bold text-[#adc6ff] tracking-tight">Edge Operator</h1>
            <p className="text-[10px] uppercase tracking-widest text-on-surface-variant/60">
              ID: {user?.displayName ? (user.displayName.substring(0, 10).toUpperCase()) : 'PRK-9920-X'}
            </p>
          </div>
        </div>
      </div>
      <nav className="flex-1 space-y-1">
        {navItems.map(({ href, label, icon }) => {
          const isActive = pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-6 py-4 transition-transform duration-200 hover:translate-x-1 ${
                isActive
                  ? 'bg-gradient-to-r from-[#adc6ff]/10 to-transparent text-[#adc6ff] border-l-4 border-[#adc6ff]'
                  : 'text-[#dce2f7]/50 hover:bg-[#232a3a] hover:text-[#dce2f7]'
              }`}
            >
              <span className="material-symbols-outlined" style={{ fontVariationSettings: isActive ? "'FILL' 1" : undefined }}>{icon}</span>
              <span>{label}</span>
            </Link>
          );
        })}
      </nav>
      <div className="mt-auto pb-8">
        <div className="px-6 mb-6">
          <button className="w-full bg-primary/10 border border-primary/20 text-primary py-3 rounded-xl font-semibold flex items-center justify-center gap-2 hover:bg-primary/20 transition-all active:scale-95">
            <span className="material-symbols-outlined text-sm">add</span>
            Add New Garage
          </button>
        </div>
        <div className="cursor-pointer flex items-center gap-3 px-6 py-4 text-[#dce2f7]/50 hover:bg-[#232a3a] hover:text-[#dce2f7]">
          <span className="material-symbols-outlined">contact_support</span>
          <span>Support</span>
        </div>
        <button onClick={logout} className="w-full cursor-pointer flex items-center gap-3 px-6 py-4 text-[#dce2f7]/50 hover:bg-[#232a3a] hover:text-error">
          <span className="material-symbols-outlined">logout</span>
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
}
