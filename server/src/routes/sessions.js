const express = require('express');
const router = express.Router();
const { getDb } = require('../db/database');

// POST /api/sessions — log a completed session
router.post('/', (req, res) => {
  const db = getDb();
  const { cards_reviewed, cards_correct, new_cards_introduced, duration_seconds } = req.body;

  if (cards_reviewed === undefined) {
    return res.status(400).json({ error: 'cards_reviewed required' });
  }

  const today = new Date().toISOString().split('T')[0];

  // Upsert today's session (accumulate)
  const existing = db.prepare('SELECT * FROM session_logs WHERE date = ?').get(today);
  if (existing) {
    db.prepare(`
      UPDATE session_logs SET
        cards_reviewed = cards_reviewed + ?,
        cards_correct = cards_correct + ?,
        new_cards_introduced = new_cards_introduced + ?,
        duration_seconds = duration_seconds + ?
      WHERE date = ?
    `).run(
      cards_reviewed || 0,
      cards_correct || 0,
      new_cards_introduced || 0,
      duration_seconds || 0,
      today
    );
    res.json(db.prepare('SELECT * FROM session_logs WHERE date = ?').get(today));
  } else {
    const result = db.prepare(`
      INSERT INTO session_logs (date, cards_reviewed, cards_correct, new_cards_introduced, duration_seconds)
      VALUES (?, ?, ?, ?, ?)
    `).run(today, cards_reviewed || 0, cards_correct || 0, new_cards_introduced || 0, duration_seconds || 0);
    res.json(db.prepare('SELECT * FROM session_logs WHERE id = ?').get(result.lastInsertRowid));
  }
});

// GET /api/sessions — get session history for heatmap
router.get('/', (req, res) => {
  const db = getDb();
  const { days = 365 } = req.query;

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - parseInt(days));
  const cutoffStr = cutoff.toISOString().split('T')[0];

  const sessions = db.prepare(`
    SELECT * FROM session_logs
    WHERE date >= ?
    ORDER BY date ASC
  `).all(cutoffStr);

  res.json(sessions);
});

// GET /api/sessions/today — today's session stats
router.get('/today', (req, res) => {
  const db = getDb();
  const today = new Date().toISOString().split('T')[0];
  const session = db.prepare('SELECT * FROM session_logs WHERE date = ?').get(today);
  res.json(session || { date: today, cards_reviewed: 0, cards_correct: 0, new_cards_introduced: 0, duration_seconds: 0 });
});

module.exports = router;
