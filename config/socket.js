import jwt from 'jsonwebtoken';
import User from '../models/User.model.js';

const onlineUsers = new Map();

export const initSocket = (io) => {
  // Auth middleware for socket
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.split(' ')[1];
      if (!token) return next(new Error('Authentication required'));

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id).select('-password');
      if (!user) return next(new Error('User not found'));

      socket.userId = decoded.id;
      socket.user = user;
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    const userId = socket.userId;
    onlineUsers.set(userId, socket.id);

    // Broadcast online status
    io.emit('user:online', { userId, online: true });

    socket.on('join:conversation', (conversationId) => {
      socket.join(`conversation:${conversationId}`);
    });

    socket.on('leave:conversation', (conversationId) => {
      socket.leave(`conversation:${conversationId}`);
    });

    socket.on('message:send', (data) => {
      io.to(`conversation:${data.conversationId}`).emit('message:receive', data);
    });

    socket.on('typing:start', ({ conversationId, userId }) => {
      socket.to(`conversation:${conversationId}`).emit('typing:start', { userId });
    });

    socket.on('typing:stop', ({ conversationId, userId }) => {
      socket.to(`conversation:${conversationId}`).emit('typing:stop', { userId });
    });

    socket.on('notification:send', ({ targetUserId, notification }) => {
      const targetSocketId = onlineUsers.get(targetUserId);
      if (targetSocketId) {
        io.to(targetSocketId).emit('notification:receive', notification);
      }
    });

    socket.on('disconnect', () => {
      onlineUsers.delete(userId);
      io.emit('user:online', { userId, online: false });
    });
  });
};

export const getOnlineUsers = () => Array.from(onlineUsers.keys());
export const isUserOnline = (userId) => onlineUsers.has(userId);
export const getSocketId = (userId) => onlineUsers.get(userId);
