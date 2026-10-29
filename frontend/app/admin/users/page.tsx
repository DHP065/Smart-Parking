'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { Users } from 'lucide-react';

const ROLES = ['user', 'admin', 'edge'];

export default function AdminUsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchUsers = async () => {
    try {
      const res = await api.get('/api/auth/users');
      setUsers(res.data.users || []);
    } catch { toast.error('Failed to load users'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchUsers(); }, []);

  const handleRoleChange = async (uid: string, role: string) => {
    try {
      await api.patch(`/api/auth/users/${uid}/role`, { role });
      toast.success('Role updated');
      setUsers(prev => prev.map(u => u.uid === uid ? { ...u, role } : u));
    } catch { toast.error('Failed to update role'); }
  };

  const handleToggleDisable = async (uid: string, disabled: boolean) => {
    try {
      await api.patch(`/api/auth/users/${uid}/disable`, { disabled: !disabled });
      toast.success(disabled ? 'User enabled' : 'User disabled');
      setUsers(prev => prev.map(u => u.uid === uid ? { ...u, disabled: !disabled } : u));
    } catch { toast.error('Failed to update user'); }
  };

  const ROLE_CLS: Record<string, string> = {
    admin: 'bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-400',
    edge: 'bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-400',
    user: 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400'
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Users</h1>
        <p className="text-sm text-gray-500 mt-1">{users.length} registered users</p>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr className="text-xs text-gray-500 uppercase tracking-wider">
                <th className="px-5 py-3 text-left">User</th>
                <th className="px-5 py-3 text-left">Registered</th>
                <th className="px-5 py-3 text-center">Role</th>
                <th className="px-5 py-3 text-center">Status</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {loading
                ? Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i}><td colSpan={5} className="px-5 py-3"><div className="h-4 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" /></td></tr>
                  ))
                : users.map(u => (
                    <tr key={u._id} className={`hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors ${u.disabled ? 'opacity-50' : ''}`}>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                            {(u.displayName || u.email || 'U')[0].toUpperCase()}
                          </div>
                          <div>
                            <p className="font-medium text-gray-900 dark:text-white">{u.displayName || '—'}</p>
                            <p className="text-xs text-gray-400">{u.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3 text-xs text-gray-500">
                        {format(new Date(u.createdAt), 'MMM d, yyyy')}
                      </td>
                      <td className="px-5 py-3 text-center">
                        <select
                          value={u.role}
                          onChange={e => handleRoleChange(u.uid, e.target.value)}
                          className={`text-xs font-medium px-2.5 py-1 rounded-full border-0 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer ${ROLE_CLS[u.role]}`}
                        >
                          {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                        </select>
                      </td>
                      <td className="px-5 py-3 text-center">
                        <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                          u.disabled
                            ? 'bg-red-100 text-red-600 dark:bg-red-950 dark:text-red-400'
                            : 'bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400'
                        }`}>
                          {u.disabled ? 'Disabled' : 'Active'}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-right">
                        <button
                          onClick={() => handleToggleDisable(u.uid, u.disabled)}
                          className={`text-xs font-medium px-3 py-1.5 rounded-lg border transition-colors ${
                            u.disabled
                              ? 'border-emerald-200 text-emerald-600 hover:bg-emerald-50 dark:border-emerald-800 dark:hover:bg-emerald-950'
                              : 'border-red-200 text-red-600 hover:bg-red-50 dark:border-red-800 dark:hover:bg-red-950'
                          }`}
                        >
                          {u.disabled ? 'Enable' : 'Disable'}
                        </button>
                      </td>
                    </tr>
                  ))
              }
            </tbody>
          </table>
          {!loading && users.length === 0 && (
            <div className="text-center py-10">
              <Users className="h-8 w-8 text-gray-300 mx-auto mb-2" />
              <p className="text-gray-400 text-sm">No users yet</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
