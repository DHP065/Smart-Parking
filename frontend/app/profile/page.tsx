'use client';

import { useEffect, useState } from 'react';
import UserNavbar from '@/components/shared/UserNavbar';
import { useAuth } from '@/lib/auth-context';
import api from '@/lib/api';
import { format } from 'date-fns';
import Link from 'next/link';
import {
  User, Mail, Calendar, LogOut, Car, History, AlertTriangle
} from 'lucide-react';

export default function ProfilePage() {
  const { user, dbUser, logout } = useAuth();
  const [stats, setStats] = useState({ total: 0, active: 0, used: 0, cancelled: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    api.get('/api/reservations/my').then(res => {
      const list: any[] = res.data.reservations || [];
      setStats({
        total: list.length,
        active: list.filter(r => r.status === 'active').length,
        used: list.filter(r => r.status === 'used').length,
        cancelled: list.filter(r => r.status === 'cancelled').length
      });
    }).finally(() => setLoading(false));
  }, [user]);

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
        <UserNavbar />
        <div className="pt-28 flex flex-col items-center text-center px-4">
          <AlertTriangle className="h-12 w-12 text-amber-400 mb-3" />
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Not signed in</h2>
          <Link href="/auth/login" className="px-6 py-2.5 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700">
            Sign In
          </Link>
        </div>
      </div>
    );
  }

  const initials = (user.displayName || user.email || 'U')[0].toUpperCase();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <UserNavbar />
      <div className="pt-20 max-w-lg mx-auto px-4 py-6">

        {/* Profile Card */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6 mb-4 shadow-sm text-center">
          {user.photoURL ? (
            <img
              src={user.photoURL}
              alt="Profile"
              className="w-20 h-20 rounded-full mx-auto mb-3 ring-4 ring-blue-100 dark:ring-blue-900"
            />
          ) : (
            <div className="w-20 h-20 rounded-full mx-auto mb-3 bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-2xl font-bold ring-4 ring-blue-100 dark:ring-blue-900">
              {initials}
            </div>
          )}
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">
            {user.displayName || 'User'}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{user.email}</p>

          {dbUser && (
            <span className={`inline-block mt-2 text-xs font-medium px-3 py-1 rounded-full ${
              dbUser.role === 'admin' ? 'bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-400' :
              dbUser.role === 'edge' ? 'bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-400' :
              'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400'
            }`}>
              {dbUser.role?.charAt(0).toUpperCase() + dbUser.role?.slice(1)}
            </span>
          )}
        </div>

        {/* Info */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6 mb-4 shadow-sm">
          <h2 className="font-semibold text-gray-900 dark:text-white mb-4">Account Details</h2>
          <div className="space-y-3">
            <div className="flex items-center gap-3 text-sm">
              <User className="h-4 w-4 text-gray-400 flex-shrink-0" />
              <span className="text-gray-500 w-20">Name</span>
              <span className="text-gray-900 dark:text-white font-medium">{user.displayName || '—'}</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <Mail className="h-4 w-4 text-gray-400 flex-shrink-0" />
              <span className="text-gray-500 w-20">Email</span>
              <span className="text-gray-900 dark:text-white font-medium">{user.email}</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <Calendar className="h-4 w-4 text-gray-400 flex-shrink-0" />
              <span className="text-gray-500 w-20">Joined</span>
              <span className="text-gray-900 dark:text-white font-medium">
                {user.metadata.creationTime ? format(new Date(user.metadata.creationTime), 'MMM d, yyyy') : '—'}
              </span>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6 mb-4 shadow-sm">
          <h2 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <History className="h-4 w-4 text-blue-600" />
            Reservation Stats
          </h2>
          {loading ? (
            <div className="grid grid-cols-4 gap-3">
              {[1,2,3,4].map(i => <div key={i} className="h-16 bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse" />)}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: 'Total', value: stats.total, color: 'text-gray-900 dark:text-white' },
                { label: 'Active', value: stats.active, color: 'text-emerald-600 dark:text-emerald-400' },
                { label: 'Used', value: stats.used, color: 'text-blue-600 dark:text-blue-400' },
                { label: 'Cancelled', value: stats.cancelled, color: 'text-red-600 dark:text-red-400' }
              ].map(({ label, value, color }) => (
                <div key={label} className="text-center p-3 bg-gray-50 dark:bg-gray-800 rounded-xl">
                  <p className={`text-2xl font-bold ${color}`}>{value}</p>
                  <p className="text-xs text-gray-500">{label}</p>
                </div>
              ))}
            </div>
          )}
          <Link href="/reservations" className="block text-center text-sm text-blue-600 hover:text-blue-700 mt-4 font-medium">
            View all reservations →
          </Link>
        </div>

        {/* Role-based shortcuts */}
        {dbUser?.role === 'admin' && (
          <div className="bg-purple-50 dark:bg-purple-950 border border-purple-200 dark:border-purple-800 rounded-2xl p-4 mb-4">
            <p className="text-sm font-medium text-purple-700 dark:text-purple-300 mb-2">Admin Access</p>
            <Link href="/admin/dashboard" className="text-sm text-purple-600 hover:underline">
              Go to Admin Dashboard →
            </Link>
          </div>
        )}
        {dbUser?.role === 'edge' && (
          <div className="bg-orange-50 dark:bg-orange-950 border border-orange-200 dark:border-orange-800 rounded-2xl p-4 mb-4">
            <p className="text-sm font-medium text-orange-700 dark:text-orange-300 mb-2">Edge Operator Access</p>
            <Link href="/edge/monitor" className="text-sm text-orange-600 hover:underline">
              Go to Edge Dashboard →
            </Link>
          </div>
        )}

        {/* Sign out */}
        <button
          onClick={logout}
          className="flex items-center justify-center gap-2 w-full py-3 bg-red-50 hover:bg-red-100 dark:bg-red-950 dark:hover:bg-red-900 text-red-600 dark:text-red-400 rounded-xl font-medium transition-colors"
        >
          <LogOut className="h-4 w-4" />
          Sign Out
        </button>
      </div>
    </div>
  );
}
