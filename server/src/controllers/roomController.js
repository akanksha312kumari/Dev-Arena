const Room = require('../models/Room');

const createRoom = async (req, res) => {
  try {
    const { name, description } = req.body;
    const inviteCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    
    const room = await Room.create({
      name,
      description,
      members: [req.user._id],
      admins: [req.user._id],
      inviteCode,
    });
    await room.populate('members', 'username profile.avatar stats.globalRating');
    await room.populate('admins', 'username');
    
    res.status(201).json(room);
  } catch (error) {
    res.status(500).json({ message: 'Error creating room', error: error.message });
  }
};

const getRooms = async (req, res) => {
  try {
    const rooms = await Room.find({ members: req.user._id })
      .populate('members', 'username profile.avatar stats.globalRating')
      .populate('admins', 'username');
    res.json(rooms);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching rooms' });
  }
};

const joinRoom = async (req, res) => {
  try {
    const { inviteCode } = req.body;
    const room = await Room.findOne({ inviteCode: inviteCode.toUpperCase() });
    
    if (!room) {
      return res.status(404).json({ message: 'Invalid invite code' });
    }

    if (!room.members.includes(req.user._id)) {
      room.members.push(req.user._id);
      await room.save();
    }

    await room.populate('members', 'username profile.avatar stats.globalRating');
    await room.populate('admins', 'username');
    res.json(room);
  } catch (error) {
    res.status(500).json({ message: 'Error joining room' });
  }
};

const inviteMember = async (req, res) => {
  try {
    const { userId } = req.body;
    const room = await Room.findById(req.params.id);
    if (!room) return res.status(404).json({ message: 'Room not found' });
    
    if (!room.admins.includes(req.user._id)) {
      return res.status(403).json({ message: 'Only admins can invite' });
    }
    
    if (!room.members.includes(userId)) {
      room.members.push(userId);
      await room.save();
    }
    
    await room.populate('members', 'username profile.avatar stats.globalRating');
    await room.populate('admins', 'username');
    res.json(room);
  } catch (error) {
    res.status(500).json({ message: 'Error inviting member' });
  }
};

const kickMember = async (req, res) => {
  try {
    const { userId } = req.body;
    const room = await Room.findById(req.params.id);
    if (!room) return res.status(404).json({ message: 'Room not found' });
    
    if (!room.admins.includes(req.user._id)) {
      return res.status(403).json({ message: 'Only admins can kick' });
    }
    
    room.members = room.members.filter(id => id.toString() !== userId);
    room.admins = room.admins.filter(id => id.toString() !== userId);
    
    await room.save();
    
    await room.populate('members', 'username profile.avatar stats.globalRating');
    await room.populate('admins', 'username');
    res.json(room);
  } catch (error) {
    res.status(500).json({ message: 'Error kicking member' });
  }
};

module.exports = { createRoom, getRooms, joinRoom, inviteMember, kickMember };
