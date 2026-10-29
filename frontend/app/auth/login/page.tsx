'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  auth,
  signInWithEmailAndPassword,
  signInWithPopup,
  googleProvider
} from '@/lib/firebase';
import api from '@/lib/api';
import { toast } from 'sonner';
import { Car, Mail, Lock, Eye, EyeOff, Chrome, ShieldAlert } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { setMockUser } = useAuth();

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      toast.success('Welcome back!');
      router.push('/');
    } catch (err: any) {
      toast.error(err.message.replace('Firebase:', '').trim());
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      // Register in MongoDB if first time
      await api.post('/api/auth/register', {
        uid: result.user.uid,
        email: result.user.email,
        displayName: result.user.displayName,
        photoURL: result.user.photoURL
      });
      toast.success('Welcome!');
      router.push('/');
    } catch (err: any) {
      toast.error(err.message.replace('Firebase:', '').trim());
    } finally {
      setLoading(false);
    }
  };

  const handleMockAdminLogin = async () => {
    setLoading(true);
    try {
      await setMockUser({
        uid: 'mock-admin-uid-1234',
        email: 'admin@smartpark.local',
        displayName: 'Test Admin',
        photoURL: ''
      });
      
      // Force role to admin for our mock user in DB
      await api.patch('/api/auth/users/mock-admin-uid-1234/role', { role: 'admin' }).catch(() => {});
      
      toast.success('Logged in as Mock Admin');
      router.push('/admin/dashboard');
    } catch (err: any) {
      toast.error('Mock login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleMockEdgeLogin = async () => {
    setLoading(true);
    try {
      await setMockUser({
        uid: 'mock-edge-uid-5678',
        email: 'edge@smartpark.local',
        displayName: 'Test Edge Operator',
        photoURL: ''
      });
      
      // Force role to edge for our mock user in DB
      await api.patch('/api/auth/users/mock-edge-uid-5678/role', { role: 'edge' }).catch(() => {});
      
      toast.success('Logged in as Mock Edge Operator');
      router.push('/edge/monitor');
    } catch (err: any) {
      toast.error('Mock login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-indigo-50 dark:from-gray-950 dark:via-gray-900 dark:to-blue-950 px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="p-3 bg-blue-600 rounded-2xl shadow-lg shadow-blue-200 dark:shadow-blue-900/40">
            <Car className="h-8 w-8 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">SmartPark</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">Intelligent Parking</p>
          </div>
        </div>

        {/* Card */}
        <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-xl border border-gray-100 dark:border-gray-800 p-8">
           <div className="flex justify-between items-center mb-2">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Sign In</h2>
            <div className="flex items-center gap-2">
              <button type="button" onClick={handleMockEdgeLogin} className="text-xs bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 px-2 py-1 rounded flex items-center gap-1 hover:bg-orange-200 transition-colors">
                <ShieldAlert className="w-3 h-3" /> Mock Edge
              </button>
              <button type="button" onClick={handleMockAdminLogin} className="text-xs bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 px-2 py-1 rounded flex items-center gap-1 hover:bg-red-200 transition-colors">
                <ShieldAlert className="w-3 h-3" /> Mock Admin
              </button>
            </div>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
            Welcome back! Enter your credentials to continue.
          </p>

          {/* Google */}
          <button
            onClick={handleGoogleLogin}
            disabled={loading}
            className="flex items-center justify-center gap-3 w-full py-3 px-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 font-medium text-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 mb-4"
          >
            <Chrome className="h-5 w-5 text-blue-500" />
            Continue with Google
          </button>

          <div className="flex items-center gap-3 mb-4">
            <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
            <span className="text-xs text-gray-400">or</span>
            <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
          </div>

          {/* Email Form */}
          <form onSubmit={handleEmailLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  placeholder="you@example.com"
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                  className="w-full pl-10 pr-10 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-200 dark:shadow-blue-900/30"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-6">
            Don&apos;t have an account?{' '}
            <Link href="/auth/register" className="text-blue-600 hover:text-blue-700 font-medium">
              Create one
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
