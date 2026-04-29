const express = require('express');
const router = express.Router();
const { getDb } = require('../db/database');

// GET /api/cards — query cards with optional filters
router.get('/', (req, res) => {
  const db = getDb();
  const { hsk_level, limit = 20, offset = 0, search } = req.query;

  let query = `SELECT c.*, ucp.ease_factor, ucp.interval_days, ucp.repetitions,
    ucp.next_review_date, ucp.last_rating, ucp.last_reviewed_at
    FROM cards c
    LEFT JOIN user_card_progress ucp ON ucp.card_id = c.id
    WHERE 1=1`;
  const params = [];

  if (hsk_level) {
    query += ' AND c.hsk_level = ?';
    params.push(parseInt(hsk_level));
  }
  if (search) {
    query += ' AND (c.hanzi LIKE ? OR c.pinyin LIKE ? OR c.meanings LIKE ?)';
    const term = `%${search}%`;
    params.push(term, term, term);
  }

  query += ' ORDER BY c.id LIMIT ? OFFSET ?';
  params.push(parseInt(limit), parseInt(offset));

  const cards = db.prepare(query).all(...params);
  const parsed = cards.map(parseCard);
  res.json(parsed);
});

// GET /api/cards/:id — single card
router.get('/:id', (req, res) => {
  const db = getDb();
  const card = db.prepare(`
    SELECT c.*, ucp.ease_factor, ucp.interval_days, ucp.repetitions,
      ucp.next_review_date, ucp.last_rating, ucp.last_reviewed_at
    FROM cards c
    LEFT JOIN user_card_progress ucp ON ucp.card_id = c.id
    WHERE c.id = ?
  `).get(parseInt(req.params.id));

  if (!card) return res.status(404).json({ error: 'Card not found' });
  res.json(parseCard(card));
});

// GET /api/cards/session/due — get cards due for review
router.get('/session/due', (req, res) => {
  const db = getDb();
  const { levels, limit = 20 } = req.query;
  const today = new Date().toISOString().split('T')[0];

  let levelFilter = '';
  const params = [];

  if (levels) {
    const levelList = levels.split(',').map(Number);
    levelFilter = `AND c.hsk_level IN (${levelList.map(() => '?').join(',')})`;
    params.push(...levelList);
  }

  // Due reviews first, then new cards
  const dueCards = db.prepare(`
    SELECT c.*, ucp.ease_factor, ucp.interval_days, ucp.repetitions,
      ucp.next_review_date, ucp.last_rating, ucp.last_reviewed_at
    FROM cards c
    INNER JOIN user_card_progress ucp ON ucp.card_id = c.id
    WHERE ucp.next_review_date <= ? AND ucp.last_reviewed_at IS NOT NULL
    ${levelFilter}
    ORDER BY ucp.next_review_date ASC
    LIMIT ?
  `).all(today, ...params, parseInt(limit));

  res.json(dueCards.map(parseCard));
});

// GET /api/cards/session/new — get new unseen cards
router.get('/session/new', (req, res) => {
  const db = getDb();
  const { levels, limit = 20 } = req.query;

  let levelFilter = '';
  const params = [];

  if (levels) {
    const levelList = levels.split(',').map(Number);
    levelFilter = `AND c.hsk_level IN (${levelList.map(() => '?').join(',')})`;
    params.push(...levelList);
  }

  const newCards = db.prepare(`
    SELECT c.*
    FROM cards c
    LEFT JOIN user_card_progress ucp ON ucp.card_id = c.id
    WHERE (ucp.id IS NULL OR ucp.last_reviewed_at IS NULL)
    ${levelFilter}
    ORDER BY c.id ASC
    LIMIT ?
  `).all(...params, parseInt(limit));

  res.json(newCards.map(parseCard));
});

function parseCard(card) {
  return {
    ...card,
    meanings: tryParse(card.meanings, []),
    examples: tryParse(card.examples, []),
    components: tryParse(card.components, []),
    tags: tryParse(card.tags, []),
  };
}

function tryParse(val, fallback) {
  try { return JSON.parse(val); } catch { return fallback; }
}

module.exports = router;
