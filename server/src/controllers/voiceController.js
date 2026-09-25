const fs = require('fs');
const axios = require('axios');
const FormData = require('form-data');

// Text-to-Speech (TTS) via ElevenLabs REST API
exports.textToSpeech = async (req, res) => {
  try {
    const apiKey = process.env.ELEVENLABS_API_KEY;
    if (!apiKey) {
      return res.status(503).json({ message: 'Voice service unavailable: Missing ElevenLabs API Key.' });
    }

    const { text } = req.body;
    if (!text || typeof text !== 'string' || text.trim() === '') {
      return res.status(400).json({ message: 'Text is required for TTS.' });
    }

    if (text.length > 3000) {
      return res.status(400).json({ message: 'Text exceeds maximum length for TTS.' });
    }

    const voiceId = process.env.ELEVENLABS_TTS_VOICE_ID || '21m00Tcm4TlvDq8ikWAM'; // Rachel voice
    const modelId = process.env.ELEVENLABS_TTS_MODEL_ID || 'eleven_multilingual_v2';

    const response = await axios.post(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
      {
        text: text.trim(),
        model_id: modelId,
        output_format: 'mp3_44100_128',
      },
      {
        headers: {
          'xi-api-key': apiKey,
          'Content-Type': 'application/json',
        },
        responseType: 'stream',
      }
    );

    res.set({ 'Content-Type': 'audio/mpeg' });
    response.data.pipe(res);

  } catch (error) {
    console.error('ElevenLabs TTS error:', error.message);
    if (!res.headersSent) {
      res.status(500).json({ message: 'Failed to generate speech from text.', details: error.message });
    }
  }
};

// Speech-to-Text (STT) via ElevenLabs REST API
exports.speechToText = async (req, res) => {
  try {
    const apiKey = process.env.ELEVENLABS_API_KEY;
    if (!apiKey) {
      if (req.file && req.file.path && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
      return res.status(503).json({ message: 'Voice service unavailable: Missing ElevenLabs API Key.' });
    }

    if (!req.file) {
      return res.status(400).json({ message: 'Audio file is required for STT.' });
    }

    const formData = new FormData();
    formData.append('file', fs.createReadStream(req.file.path));
    formData.append('model_id', 'scribe_v1');

    const response = await axios.post(
      'https://api.elevenlabs.io/v1/speech-to-text',
      formData,
      {
        headers: {
          'xi-api-key': apiKey,
          ...formData.getHeaders(),
        },
      }
    );

    // Cleanup temp file
    if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);

    return res.status(200).json({ transcript: response.data.text || response.data.transcript || '' });

  } catch (error) {
    console.error('ElevenLabs STT error:', error.message);
    if (req.file && req.file.path && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    return res.status(500).json({ message: 'Failed to transcribe audio.', details: error.message });
  }
};
