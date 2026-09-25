const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const roomHandler = require('./roomHandler');
const duelHandler = require('./duelHandler');
const User = require('../models/User');

const initSocket = (server) => {
  const io = new Server(server, {
    cors: {
      origin: '*', // For dev, allow all
      methods: ['GET', 'POST']
    }
  });

  // Keep track of connected users (socketId -> userId)
  const connectedUsers = new Map();

  const broadcastOnlineUsers = async () => {
    try {
      const uniqueUserIds = [...new Set(connectedUsers.values())];
      const users = await User.find({ _id: { $in: uniqueUserIds } })
        .select('username profile.avatar stats.rating');
      io.emit('online_users_update', users);
    } catch (err) {
      console.error('Failed to broadcast online users', err);
    }
  };

  // JWT handshake authentication middleware
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token || socket.handshake.query?.token;
    if (!token) {
      console.warn(`[Socket Auth Warning] Connection rejected: No token provided (socket: ${socket.id})`);
      return next(new Error('Authentication error: Token missing'));
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.userId = decoded.id;
      next();
    } catch (err) {
      console.warn(`[Socket Auth Warning] Connection rejected: Invalid token (socket: ${socket.id}, error: ${err.message})`);
      return next(new Error('Authentication error: Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`User connected: ${socket.id} (verified user: ${socket.userId})`);

    // Map verified socket.userId
    connectedUsers.set(socket.id, socket.userId);
    socket.join(socket.userId);
    broadcastOnlineUsers();

    // Legacy handler kept for compatibility but no longer updates mapping from client input
    socket.on('authenticate', (clientUserId) => {
      console.log(`Socket ${socket.id} (verified: ${socket.userId}) client-sent ID: ${clientUserId}`);
    });

    // Delegate events to modular handlers
    roomHandler(io, socket, connectedUsers);
    duelHandler(io, socket, connectedUsers);

    socket.on('disconnect', () => {
      console.log(`User disconnected: ${socket.id}`);
      connectedUsers.delete(socket.id);
      broadcastOnlineUsers();
    });
  });

  return io;
};

module.exports = initSocket;
