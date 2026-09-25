const express = require('express');
const router = express.Router();
const { updateProfile, searchUsers, getFriends, sendFriendRequest, getFriendRequests, acceptFriendRequest, rejectFriendRequest, getUserProfile } = require('../controllers/userController');
const { protect } = require('../middleware/authMiddleware');

router.put('/profile', protect, updateProfile);
router.get('/search', protect, searchUsers);
router.get('/friends', protect, getFriends);
router.post('/friends/request/:id', protect, sendFriendRequest);
router.get('/friends/requests', protect, getFriendRequests);
router.post('/friends/accept/:id', protect, acceptFriendRequest);
router.post('/friends/reject/:id', protect, rejectFriendRequest);
router.get('/profile/:id', protect, getUserProfile);

module.exports = router;
