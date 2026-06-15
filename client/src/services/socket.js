import { io } from 'socket.io-client';

const socketUrl = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

let socket = null;

export const initSocket = (token) => {
  if (socket) {
    socket.disconnect();
  }

  socket = io(socketUrl, {
    auth: {
      token: token || localStorage.getItem('accessToken'),
    },
    autoConnect: true,
    reconnection: true,
  });

  socket.on('connect', () => {
    console.log('🔌 Connected to Socket.io server');
  });

  socket.on('disconnect', () => {
    console.log('🔌 Disconnected from Socket.io server');
  });

  return socket;
};

export const getSocket = () => {
  if (!socket) {
    const token = localStorage.getItem('accessToken');
    if (token) {
      return initSocket(token);
    }
  }
  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};
