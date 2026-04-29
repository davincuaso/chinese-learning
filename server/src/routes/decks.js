const express = require('express');
const router = express.Router();
const { getDb } = require('../db/database');

// GET /api/decks — list all decks with card counts and due counts
router.get('/', (req, res) => {
  const db = getDb();
  const today = new Date().toISOString().split('T')[0];

  const decks = db.prepare(`
    SELECT d.*,
      COUNT(DISTINCT c.id) as card_count,
      COUNT(DISTINCT CASE WHEN ucp.next_review_date <= ? THEN c.id END) as due_count,
      COUNT(DISTINCT CASE WHEN ucp.repetitions = 0 AND ucp.last_reviewed_at IS NULL THEN c.id END) as new_count
    FROM decks d
    LEFT JOIN cards c ON c.hsk_level = d.hsk_level
    LEFT JOIN user_card_progress ucp ON ucp.card_id = c.id
    GROUP BY d.id
    ORDER BY d.hsk_level
  `).all(today);

  res.json(decks);
});

// GET /api/decks/:level — get single deck info
router.get('/:level', (req, res) => {
  const db = getDb();
  const level = parseInt(req.params.level);
  const today = new Date().toISOString().split('T')[0];

  const deck = db.prepare(`
    SELECT d.*,
      COUNT(DISTINCT c.id) as card_count,
      COUNT(DISTINCT CASE WHEN ucp.next_review_date <= ? THEN c.id END) as due_count
    FROM decks d
    LEFT JOIN cards c ON c.hsk_level = d.hsk_level
    LEFT JOIN user_card_progress ucp ON ucp.card_id = c.id
    WHERE d.hsk_level = ?
    GROUP BY d.id
  `).get(today, level);

  if (!deck) return res.status(404).json({ error: 'Deck not found' });
  res.json(deck);
});

module.exports = router;
