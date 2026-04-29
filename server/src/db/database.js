const { DatabaseSync } = require('node:sqlite');
const path = require('path');
const fs = require('fs');

const DB_PATH = path.join(__dirname, '../../data/chinese_learning.db');

// Ensure data directory exists
fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

let db;

function getDb() {
  if (!db) {
    db = new DatabaseSync(DB_PATH);
    db.exec('PRAGMA journal_mode = WAL');
    db.exec('PRAGMA foreign_keys = ON');
  }
  return db;
}

function initSchema() {
  const database = getDb();

  database.exec(`
    CREATE TABLE IF NOT EXISTS decks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      hsk_level INTEGER NOT NULL UNIQUE,
      name TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS cards (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      hanzi TEXT NOT NULL,
      pinyin TEXT NOT NULL,
      meanings TEXT NOT NULL,
      hsk_level INTEGER NOT NULL,
      examples TEXT NOT NULL DEFAULT '[]',
      components TEXT NOT NULL DEFAULT '[]',
      tags TEXT NOT NULL DEFAULT '[]',
      UNIQUE(hanzi, hsk_level)
    );

    CREATE TABLE IF NOT EXISTS user_card_progress (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      card_id INTEGER NOT NULL UNIQUE,
      ease_factor REAL NOT NULL DEFAULT 2.5,
      interval_days INTEGER NOT NULL DEFAULT 0,
      repetitions INTEGER NOT NULL DEFAULT 0,
      next_review_date TEXT NOT NULL DEFAULT (date('now')),
      last_rating INTEGER,
      last_reviewed_at TEXT,
      FOREIGN KEY (card_id) REFERENCES cards(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS session_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL DEFAULT (date('now')),
      cards_reviewed INTEGER NOT NULL DEFAULT 0,
      cards_correct INTEGER NOT NULL DEFAULT 0,
      new_cards_introduced INTEGER NOT NULL DEFAULT 0,
      duration_seconds INTEGER NOT NULL DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_cards_hsk ON cards(hsk_level);
    CREATE INDEX IF NOT EXISTS idx_progress_next_review ON user_card_progress(next_review_date);
    CREATE INDEX IF NOT EXISTS idx_progress_card ON user_card_progress(card_id);
  `);
}

module.exports = { getDb, initSchema };
