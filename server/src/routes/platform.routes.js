const express = require('express');
const router = express.Router();
const { syncPlatformData, syncAllPlatformsData } = require('../controllers/platformController');
const { protect } = require('../middleware/authMiddleware');

router.post('/sync-all', protect, syncAllPlatformsData);
router.post('/:platform', protect, syncPlatformData);

module.exports = router;
