require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const express = require('express');
const cors = require('cors');
const path = require('path');
const { initSchema } = require('./db/database');
const { detectEngine, prewarm, DEFAULT_EDGE_VOICE } = require('./services/tts');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({ origin: 'http://localhost:5173' }));
app.use(express.json());

// Serve cached audio files
app.use('/audio_cache', express.static(path.join(__dirname, '../audio_cache')));

// Initialize DB schema on startup
initSchema();

// Routes
app.use('/api/decks', require('./routes/decks'));
app.use('/api/cards', require('./routes/cards'));
app.use('/api/reviews', require('./routes/reviews'));
app.use('/api/sessions', require('./routes/sessions'));
app.use('/api/tts', require('./routes/tts'));

app.get('/', (req, res) => {
  res.type('html').send(`
    <h1>Chinese Learning API</h1>
    <p>API server is running on port ${PORT}.</p>
    <p>Frontend dev server: <a href="http://localhost:5173">http://localhost:5173</a></p>
    <p>Health check: <a href="/api/health">/api/health</a></p>
  `);
});

app.get('/api/health', (req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

app.listen(PORT, async () => {
  console.log(`Chinese Learning API running on http://localhost:${PORT}`);

  // Detect TTS engine and pre-warm HSK 1 in the background
  const engine = await detectEngine();
  if (engine !== 'webspeech') {
    prewarmHsk1().catch(err => console.warn('[TTS] Pre-warm error:', err.message));
  }
});

async function prewarmHsk1() {
  const { getDb } = require('./db/database');
  const db = getDb();

  const hsk1 = db.prepare(`
    SELECT hanzi FROM cards WHERE hsk_level = 1 ORDER BY id
  `).all();

  const items = hsk1.map(c => ({
    text: c.hanzi,
    voice: DEFAULT_EDGE_VOICE,
    speed: 'normal',
  }));

  await prewarm(items);
}
