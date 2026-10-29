import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

const getSocketUrl = () => {
  if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
    return `http://${window.location.hostname}:5000`;
  }
  return process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:5000';
};

export const getSocket = (): Socket => {
  if (!socket) {
    socket = io(getSocketUrl(), {
      autoConnect: false,
      transports: ['websocket', 'polling']
    });
  }
  return socket;
};

export const connectSocket = (): Socket => {
  const s = getSocket();
  if (!s.connected) {
    s.connect();
  }
  return s;
};

export const disconnectSocket = (): void => {
  if (socket?.connected) {
    socket.disconnect();
  }
};

export const joinLocationRoom = (locationId: string): void => {
  const s = getSocket();
  if (s.connected) {
    s.emit('join:location', locationId);
  }
};

export const leaveLocationRoom = (locationId: string): void => {
  const s = getSocket();
  if (s.connected) {
    s.emit('leave:location', locationId);
  }
};

export default getSocket;
