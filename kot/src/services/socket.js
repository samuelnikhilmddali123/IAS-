import { io } from 'socket.io-client';
import { BASE_URL } from './api';

let socketInstance = null;

export const getSocket = () => {
  if (!socketInstance) {
    socketInstance = io(BASE_URL, {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 10,
      reconnectionDelay: 2000,
      autoConnect: true
    });

    socketInstance.on('connect', () => {
      console.log('⚡ Socket connected to backend:', socketInstance.id);
    });

    socketInstance.on('disconnect', (reason) => {
      console.log('⚠️ Socket disconnected:', reason);
    });

    socketInstance.on('connect_error', (error) => {
      console.warn('Socket connection error:', error.message);
    });
  }
  return socketInstance;
};
