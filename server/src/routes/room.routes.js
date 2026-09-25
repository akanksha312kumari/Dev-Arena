const express = require('express');
const router = express.Router();
const { createRoom, getRooms, joinRoom, inviteMember, kickMember } = require('../controllers/roomController');
const { protect } = require('../middleware/authMiddleware');

router.post('/', protect, createRoom);
router.get('/', protect, getRooms);
router.post('/join', protect, joinRoom);
router.post('/:id/invite', protect, inviteMember);
router.post('/:id/kick', protect, kickMember);

module.exports = router;
