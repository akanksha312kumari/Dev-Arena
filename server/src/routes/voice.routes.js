const express = require('express');
const router = express.Router();
const multer = require('multer');
const os = require('os');
const { protect } = require('../middleware/authMiddleware');
const { textToSpeech, speechToText } = require('../controllers/voiceController');

// Configure multer for temp file uploads
const upload = multer({ 
  dest: os.tmpdir(),
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

// @route   POST /api/voice/tts
// @desc    Convert text to speech (AI Coach)
// @access  Private
router.post('/tts', protect, textToSpeech);

// @route   POST /api/voice/stt
// @desc    Convert speech to text (Socratic Quiz)
// @access  Private
router.post('/stt', protect, upload.single('audio'), speechToText);

module.exports = router;
