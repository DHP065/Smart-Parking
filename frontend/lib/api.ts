import axios from 'axios';
import { auth, signOut } from './firebase';

const getBaseUrl = () => {
  if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
    return `http://${window.location.hostname}:5000`;
  }
  return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
};

const api = axios.create({
  baseURL: getBaseUrl(),
  timeout: 15000
});

// Request interceptor: attach Firebase ID token to every request
api.interceptors.request.use(
  async (config) => {
    try {
      if (typeof window !== 'undefined') {
        const mockToken = localStorage.getItem('mockToken');
        if (mockToken) {
          config.headers.Authorization = `Bearer ${mockToken}`;
          return config;
        }
      }
      
      if (auth.currentUser) {
        const token = await auth.currentUser.getIdToken();
        config.headers.Authorization = `Bearer ${token}`;
      } else if (process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID === 'your-firebase-project-id' || !process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID) {
         // Mock token for local testing without Firebase
         config.headers.Authorization = `Bearer mock-token`;
      }
    } catch (error) {
      console.error('Error getting auth token:', error);
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor: handle 401 globally
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Clear all local auth state
      if (typeof window !== 'undefined') {
        localStorage.removeItem('mockToken');
        localStorage.removeItem('mockUser');
        if (auth.currentUser) {
          signOut(auth).catch(console.error);
        }
        
        // Prevent redirect loop
        if (window.location.pathname !== '/auth/login' && window.location.pathname !== '/auth/register') {
          window.location.href = '/auth/login';
        }
      }
    }
    return Promise.reject(error);
  }
);

export default api;
