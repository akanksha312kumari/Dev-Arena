const Message = require('../models/Message');

module.exports = (io, socket, connectedUsers) => {
  // Join a specific room
  socket.on('join_room', (roomId) => {
    socket.join(roomId);
    console.log(`Socket ${socket.id} joined room ${roomId}`);
    
    // Broadcast to room that a user joined
    const userId = connectedUsers.get(socket.id);
    if (userId) {
      socket.to(roomId).emit('room_notification', {
        type: 'USER_JOINED',
        userId,
        roomId,
        message: 'A user joined the room'
      });
    }

    // Send the list of online user IDs in this room to everyone
    broadcastOnlineMembers(io, roomId, connectedUsers);

    // Fetch and send message history
    Message.find({ room: roomId })
      .populate('sender', 'username')
      .sort({ createdAt: 1 })
      .limit(100)
      .then((messages) => {
        const formattedMessages = messages.map(m => ({
          roomId: m.room,
          message: m.content,
          senderId: m.sender._id,
          senderName: m.sender.username,
          timestamp: m.createdAt
        }));
        socket.emit('room_history', formattedMessages);
      })
      .catch(err => console.error('Error fetching room history:', err));
  });

  // Leave a specific room
  socket.on('leave_room', (roomId) => {
    socket.leave(roomId);
    console.log(`Socket ${socket.id} left room ${roomId}`);
    
    // Send updated list of online user IDs
    broadcastOnlineMembers(io, roomId, connectedUsers);
  });

  socket.on('disconnect', () => {
    // When a user disconnects, their sockets leave the rooms automatically,
    // but we can't easily broadcast to specific rooms here. We could iterate rooms they were in.
    // Let's rely on leave_room for explicit leaves, or polling.
  });

  // Handle incoming chat messages
  socket.on('send_message', async (data) => {
    const { roomId, message, senderId, senderName, timestamp } = data;
    
    try {
      const newMsg = await Message.create({
        room: roomId,
        sender: senderId,
        content: message
      });
      
      // Broadcast message to all other clients in the room
      socket.to(roomId).emit('receive_message', {
        roomId,
        message,
        senderId,
        senderName,
        timestamp: newMsg.createdAt
      });
    } catch (err) {
      console.error('Error saving message:', err);
    }
  });

  // Typing indicators
  socket.on('typing', ({ roomId, username }) => {
    socket.to(roomId).emit('user_typing', { username });
  });

  socket.on('stop_typing', ({ roomId, username }) => {
    socket.to(roomId).emit('user_stop_typing', { username });
  });
};

function broadcastOnlineMembers(io, roomId, connectedUsers) {
  const roomSockets = io.sockets.adapter.rooms.get(roomId);
  if (!roomSockets) return;
  
  const onlineUserIds = new Set();
  for (const socketId of roomSockets) {
    const uid = connectedUsers.get(socketId);
    if (uid) onlineUserIds.add(uid);
  }
  
  io.to(roomId).emit('online_members_update', Array.from(onlineUserIds));
}
