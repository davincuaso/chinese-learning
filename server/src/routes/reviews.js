const express = require('express');
const router = express.Router();
const { getDb } = require('../db/database');
const { calculateNextReview, newProgress } = require('../services/sm2');

// POST /api/reviews — submit a review rating for a card
router.post('/', (req, res) => {
  const db = getDb();
  const { card_id, rating } = req.body;

  if (!card_id || rating === undefined || rating < 0 || rating > 3) {
    return res.status(400).json({ error: 'card_id and rating (0-3) required' });
  }

  const card = db.prepare('SELECT id FROM cards WHERE id = ?').get(card_id);
  if (!card) return res.status(404).json({ error: 'Card not found' });

  let progress = db.prepare('SELECT * FROM user_card_progress WHERE card_id = ?').get(card_id);

  if (!progress) {
    const np = newProgress(card_id);
    db.prepare(`
      INSERT INTO user_card_progress
        (card_id, ease_factor, interval_days, repetitions, next_review_date, last_rating, last_reviewed_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(np.card_id, np.ease_factor, np.interval_days, np.repetitions,
           np.next_review_date, np.last_rating, np.last_reviewed_at);
    progress = db.prepare('SELECT * FROM user_card_progress WHERE card_id = ?').get(card_id);
  }

  const updated = calculateNextReview(progress, rating);

  db.prepare(`
    UPDATE user_card_progress SET
      ease_factor = ?,
      interval_days = ?,
      repetitions = ?,
      next_review_date = ?,
      last_rating = ?,
      last_reviewed_at = ?
    WHERE card_id = ?
  `).run(updated.ease_factor, updated.interval_days, updated.repetitions,
         updated.next_review_date, updated.last_rating, updated.last_reviewed_at,
         card_id);

  res.json({ ...updated, card_id });
});

// GET /api/reviews/stats — overall stats
router.get('/stats', (req, res) => {
  const db = getDb();
  const today = new Date().toISOString().split('T')[0];

  const totalCards = db.prepare('SELECT COUNT(*) as n FROM cards').get().n;
  const studied = db.prepare('SELECT COUNT(*) as n FROM user_card_progress WHERE last_reviewed_at IS NOT NULL').get().n;
  const due = db.prepare('SELECT COUNT(*) as n FROM user_card_progress WHERE next_review_date <= ?').get(today).n;
  const newUnseen = db.prepare(`
    SELECT COUNT(*) as n FROM cards c
    LEFT JOIN user_card_progress ucp ON ucp.card_id = c.id
    WHERE ucp.id IS NULL OR ucp.last_reviewed_at IS NULL
  `).get().n;

  // Retention: cards with repetitions >= 1 and last_rating >= 2
  const retained = db.prepare(`
    SELECT COUNT(*) as n FROM user_card_progress
    WHERE repetitions >= 1 AND last_rating >= 2
  `).get().n;
  const retention_rate = studied > 0 ? Math.round((retained / studied) * 100) : 0;

  // Daily streak
  const streak = calculateStreak(db);

  res.json({ totalCards, studied, due, newUnseen, retention_rate, streak });
});

function calculateStreak(db) {
  const logs = db.prepare(`
    SELECT DISTINCT date FROM session_logs
    ORDER BY date DESC
  `).all();

  if (!logs.length) return 0;

  const today = new Date().toISOString().split('T')[0];
  let streak = 0;
  let current = new Date(today);

  for (const log of logs) {
    const logDate = log.date;
    const expected = current.toISOString().split('T')[0];
    if (logDate === expected) {
      streak++;
      current.setDate(current.getDate() - 1);
    } else {
      break;
    }
  }

  return streak;
}

module.exports = router;
