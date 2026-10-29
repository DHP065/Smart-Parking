'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, auth, signOut, type User } from '@/lib/firebase';
import api from '@/lib/api';

interface AuthContextType {
  user: User | null;
  dbUser: any | null;
  loading: boolean;
  logout: () => Promise<void>;
  refreshDbUser: () => Promise<void>;
  setMockUser: (user: any) => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  dbUser: null,
  loading: true,
  logout: async () => {},
  refreshDbUser: async () => {},
  setMockUser: () => {}
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [dbUser, setDbUser] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [isMockAuth, setIsMockAuth] = useState(false);

  const fetchDbUser = async (firebaseUser: User | { uid: string }) => {
    try {
      const res = await api.get('/api/auth/me');
      setDbUser(res.data.user);
    } catch {
      setDbUser(null);
    }
  };

  const refreshDbUser = async () => {
    if (user || isMockAuth) await fetchDbUser(user || { uid: dbUser?.uid });
  };

  const setMockUser = async (mockData: any) => {
    setIsMockAuth(true);
    setUser(mockData as User);
    if (typeof window !== 'undefined') {
      localStorage.setItem('mockToken', `mock-token-${mockData.uid}`);
      localStorage.setItem('mockUser', JSON.stringify(mockData));
    }
    
    try {
      // Create/upsert the mock user in the DB
      await api.post('/api/auth/register', {
        uid: mockData.uid,
        email: mockData.email,
        displayName: mockData.displayName,
        photoURL: mockData.photoURL
      });
      // Try to fetch it back to get the role
      await fetchDbUser(mockData as User);
    } catch (e) {
      console.error("Mock auth registration failed", e);
      setDbUser({ ...mockData, role: 'user' }); // Fallback
    }
    
    setLoading(false);
  };

  useEffect(() => {
    // Check for existing mock session first
    if (typeof window !== 'undefined') {
      const storedMock = localStorage.getItem('mockUser');
      if (storedMock) {
        setIsMockAuth(true);
        setUser(JSON.parse(storedMock) as User);
        fetchDbUser(JSON.parse(storedMock)).finally(() => setLoading(false));
        return;
      }
    }

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (isMockAuth) return; // Skip firebase state if using mock
      
      setUser(firebaseUser);
      if (firebaseUser) {
        await fetchDbUser(firebaseUser);
      } else {
        setDbUser(null);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, [isMockAuth]);

  const logout = async () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('mockToken');
      localStorage.removeItem('mockUser');
    }

    if (isMockAuth) {
      setIsMockAuth(false);
      setUser(null);
      setDbUser(null);
    } else {
      await signOut(auth);
      setUser(null);
      setDbUser(null);
    }
    
    if (typeof window !== 'undefined') {
      window.location.href = '/auth/login';
    }
  };

  return (
    <AuthContext.Provider value={{ user, dbUser, loading, logout, refreshDbUser, setMockUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
