const express = require('express');
const router = express.Router();
const path = require('path');
const { synthesize, listCache, clearCache, detectEngine, EDGE_VOICES, DEFAULT_EDGE_VOICE, CACHE_DIR } = require('../services/tts');

// GET /api/tts/engine — what engine is active
router.get('/engine', async (req, res) => {
  const engine = await detectEngine();
  res.json({
    engine,
    voices: engine === 'edge-tts' ? EDGE_VOICES : [],
    defaultVoice: DEFAULT_EDGE_VOICE,
  });
});

// POST /api/tts/synthesize — generate or retrieve cached audio
// Body: { text, voice?, speed?: "normal"|"slow" }
// Returns: audio/mpeg stream  OR  { engine: "webspeech" } if browser TTS should be used
router.post('/synthesize', async (req, res) => {
  const { text, voice, speed = 'normal' } = req.body;
  if (!text || typeof text !== 'string' || text.trim().length === 0) {
    return res.status(400).json({ error: 'text is required' });
  }
  if (!['normal', 'slow'].includes(speed)) {
    return res.status(400).json({ error: 'speed must be "normal" or "slow"' });
  }

  try {
    const result = await synthesize(text.trim(), voice || null, speed);

    if (result.engine === 'webspeech') {
      // Tell frontend to use browser TTS
      return res.status(200).json({ engine: 'webspeech' });
    }

    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('X-TTS-Engine', result.engine);
    res.setHeader('X-Cache', result.fromCache ? 'HIT' : 'MISS');
    res.sendFile(result.filePath);
  } catch (err) {
    console.error('[TTS] Synthesis error:', err.message);
    res.status(500).json({ error: 'TTS generation failed', detail: err.message });
  }
});

// GET /api/tts/cache — list cached entries
router.get('/cache', (req, res) => {
  const entries = listCache();
  res.json({ count: entries.length, entries });
});

// DELETE /api/tts/cache — clear all cached audio
router.delete('/cache', (req, res) => {
  const deleted = clearCache();
  res.json({ deleted, message: `Cleared ${deleted} cached files` });
});

// GET /api/tts/voices — list available TTS voices
router.get('/voices', async (req, res) => {
  const engine = await detectEngine();
  res.json({
    engine,
    voices: engine === 'edge-tts' ? EDGE_VOICES : [],
  });
});

module.exports = router;
