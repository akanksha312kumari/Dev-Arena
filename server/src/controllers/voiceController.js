const fs = require('fs');
const { ElevenLabsClient } = require('@elevenlabs/elevenlabs-js');

// We initialize on demand to ensure process.env is fully loaded
let elevenlabs = null;
const getClient = () => {
  if (!elevenlabs && process.env.ELEVENLABS_API_KEY) {
    elevenlabs = new ElevenLabsClient({ apiKey: process.env.ELEVENLABS_API_KEY });
  }
  return elevenlabs;
};

// Text-to-Speech (TTS)
exports.textToSpeech = async (req, res) => {
  try {
    const client = getClient();
    if (!process.env.ELEVENLABS_API_KEY || !client) {
      return res.status(503).json({ message: 'Voice service unavailable: Missing ElevenLabs API Key.' });
    }

    const { text } = req.body;
    if (!text || typeof text !== 'string' || text.trim() === '') {
      return res.status(400).json({ message: 'Text is required for TTS.' });
    }

    if (text.length > 3000) {
      return res.status(400).json({ message: 'Text exceeds maximum length for TTS.' });
    }

    const voiceId = process.env.ELEVENLABS_TTS_VOICE_ID || '21m00Tcm4TlvDq8ikWAM'; // fallback to Rachel
    const modelId = process.env.ELEVENLABS_TTS_MODEL_ID || 'eleven_multilingual_v2';

    // The SDK returns a stream of audio data
    const audioStream = await client.textToSpeech.convert(voiceId, {
      text: text.trim(),
      model_id: modelId,
      output_format: 'mp3_44100_128',
    });

    res.set({
      'Content-Type': 'audio/mpeg'
    });

    // The SDK returns a Web ReadableStream in Node.js 18+
    const { Readable } = require('stream');
    
    // Pipe the audio stream to the response
    const nodeStream = Readable.fromWeb(audioStream);
    
    nodeStream.on('error', (err) => {
      console.error('TTS stream error:', err);
      if (!res.headersSent) {
        res.status(500).json({ message: 'Error streaming audio' });
      }
    });

    nodeStream.pipe(res);

  } catch (error) {
    console.error('ElevenLabs TTS error:', error.message);
    if (error.body) console.error(error.body);
    if (!res.headersSent) {
      let errMsg = 'Failed to generate speech from text.';
      if (error.body && error.body.detail && error.body.detail.message) {
        errMsg = error.body.detail.message;
      } else if (error.body && typeof error.body === 'string') {
        try { errMsg = JSON.parse(error.body).detail.message || errMsg; } catch(e){}
      }
      res.status(error.statusCode || 500).json({ message: errMsg, details: error.message });
    }
  }
};

// Speech-to-Text (STT)
exports.speechToText = async (req, res) => {
  try {
    const client = getClient();
    if (!process.env.ELEVENLABS_API_KEY || !client) {
      // Clean up file if present before returning error
      if (req.file && req.file.path) fs.unlinkSync(req.file.path);
      return res.status(503).json({ message: 'Voice service unavailable: Missing ElevenLabs API Key.' });
    }

    if (!req.file) {
      return res.status(400).json({ message: 'Audio file is required for STT.' });
    }

    // Call ElevenLabs STT
    // According to SDK docs, file must be a stream.
    const audioStream = fs.createReadStream(req.file.path);

    const response = await client.speechToText.convert({
      file: audioStream,
      modelId: 'scribe_v1', // Using Scribe model for STT
    });

    // Cleanup temp file
    fs.unlinkSync(req.file.path);

    // The response has the text
    return res.status(200).json({ transcript: response.text });

  } catch (error) {
    console.error('ElevenLabs STT error:', error.message);
    if (error.body) console.error(error.body);
    // Cleanup on error
    if (req.file && req.file.path && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    let errMsg = 'Failed to transcribe audio.';
    if (error.body && error.body.detail && error.body.detail.message) {
      errMsg = error.body.detail.message;
    } else if (error.body && typeof error.body === 'string') {
      try { errMsg = JSON.parse(error.body).detail.message || errMsg; } catch(e){}
    }
    return res.status(error.statusCode || 500).json({ message: errMsg, details: error.message });
  }
};
