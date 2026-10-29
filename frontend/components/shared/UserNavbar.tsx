'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import {
  MapPin,
  Car,
  User,
  Menu,
  X,
  LogOut,
  Calendar,
  Bell,
  Sun,
  Moon
} from 'lucide-react';

const navLinks = [
  { href: '/', label: 'Map', icon: MapPin },
  { href: '/reservations', label: 'Reservations', icon: Calendar },
  { href: '/profile', label: 'Profile', icon: User }
];

export default function UserNavbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const pathname = usePathname();
  const { user, dbUser, logout } = useAuth();

  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
    document.documentElement.classList.toggle('dark');
  };

  return (
    <>
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[#000000]/80 backdrop-blur-xl border-b border-white/10 shadow-[0_8px_32px_0_rgba(173,198,255,0.08)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-3 group">
              <div className="p-2 bg-primary/10 rounded-xl group-hover:bg-primary/20 transition-colors">
                <Car className="h-5 w-5 text-primary" />
              </div>
              <span className="font-black tracking-tighter text-xl text-primary">
                SmartPark
              </span>
            </Link>

            {/* Desktop Nav */}
            <div className="hidden md:flex items-center gap-1">
              {navLinks.map(({ href, label, icon: Icon }) => (
                <Link
                  key={href}
                  href={href}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    pathname === href
                      ? 'bg-primary/10 text-primary'
                      : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </Link>
              ))}
            </div>

            {/* Right side */}
            <div className="flex items-center gap-2">
              <button
                onClick={toggleDarkMode}
                className="p-2 rounded-xl text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-colors"
              >
                {darkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
              </button>

              {user ? (
                <div className="hidden md:flex items-center gap-2">
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-surface-container-highest rounded-lg border border-outline-variant/30">
                    {user.photoURL ? (
                      <img src={user.photoURL} alt="Avatar" className="w-6 h-6 rounded-full border-2 border-primary/20 object-cover" />
                    ) : (
                      <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-primary text-xs font-bold border border-primary/30">
                        {(user.displayName || user.email || 'U')[0].toUpperCase()}
                      </div>
                    )}
                    <span className="text-sm text-on-surface font-medium">
                      {user.displayName || user.email?.split('@')[0]}
                    </span>
                  </div>
                  <button
                    onClick={logout}
                    className="flex items-center gap-1 px-3 py-1.5 text-sm text-error hover:bg-error-container hover:text-on-error-container rounded-lg transition-colors"
                  >
                    <LogOut className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <div className="hidden md:flex gap-2">
                  <Link
                    href="/auth/login"
                    className="px-4 py-2 text-sm text-gray-600 hover:text-blue-600 dark:text-gray-300 transition-colors"
                  >
                    Sign In
                  </Link>
                  <Link
                    href="/auth/register"
                    className="px-4 py-2 text-sm bg-primary text-on-primary rounded-lg font-bold hover:brightness-110 active:scale-95 transition-all"
                  >
                    Get Started
                  </Link>
                </div>
              )}

              {/* Mobile Hamburger */}
              <button
                className="md:hidden p-2 rounded-lg text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
                onClick={() => setMenuOpen(!menuOpen)}
              >
                {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile menu drawer */}
      {menuOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div
            className="absolute inset-0 bg-background/80 backdrop-blur-sm"
            onClick={() => setMenuOpen(false)}
          />
          <div className="absolute right-0 top-0 bottom-0 w-72 bg-surface-container-low shadow-2xl flex flex-col border-l border-outline-variant/10">
            <div className="flex items-center justify-between p-4 border-b border-outline-variant/10">
              <span className="font-bold text-lg text-on-surface">Menu</span>
              <button onClick={() => setMenuOpen(false)}>
                <X className="h-5 w-5 text-on-surface-variant hover:text-on-surface transition-colors" />
              </button>
            </div>

            <nav className="flex-1 p-4 space-y-1">
              {navLinks.map(({ href, label, icon: Icon }) => (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setMenuOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                    pathname === href
                      ? 'bg-primary/10 text-primary'
                      : 'text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface'
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  {label}
                </Link>
              ))}
            </nav>

            <div className="p-4 border-t border-outline-variant/10">
              {user ? (
                <button
                  onClick={() => { logout(); setMenuOpen(false); }}
                  className="flex items-center gap-3 w-full px-4 py-3 text-sm text-error hover:bg-error-container hover:text-on-error-container rounded-xl transition-colors"
                >
                  <LogOut className="h-5 w-5" />
                  Sign Out
                </button>
              ) : (
                <div className="space-y-2">
                  <Link
                    href="/auth/login"
                    onClick={() => setMenuOpen(false)}
                    className="block text-center px-4 py-2 text-sm border border-outline-variant rounded-xl font-medium text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface transition-colors"
                  >
                    Sign In
                  </Link>
                  <Link
                    href="/auth/register"
                    onClick={() => setMenuOpen(false)}
                    className="block text-center px-4 py-2 text-sm bg-primary text-on-primary rounded-xl font-bold hover:brightness-110 active:scale-95 transition-all"
                  >
                    Get Started
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
