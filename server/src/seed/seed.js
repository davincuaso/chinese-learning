#!/usr/bin/env node
// Seed script: loads HSK 1-6 vocabulary from CC-CEDICT + example sentences

const { DatabaseSync } = require('node:sqlite');
const path = require('path');
const fs = require('fs');

const DB_PATH = path.join(__dirname, '../../data/chinese_learning.db');
const CEDICT_PATH = path.join(__dirname, '../../data/cedict_parsed.json');
const shouldReset = process.argv.includes('--reset');

fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

const db = new DatabaseSync(DB_PATH);
db.exec('PRAGMA journal_mode = WAL');
db.exec('PRAGMA foreign_keys = ON');

// Initialize schema
db.exec(`
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
`);

const HSK_WORDS = require('./hsk-words');

// Load CC-CEDICT if available
let cedict = {};
if (fs.existsSync(CEDICT_PATH)) {
  console.log('Loading CC-CEDICT data...');
  cedict = JSON.parse(fs.readFileSync(CEDICT_PATH, 'utf8'));
  console.log(`Loaded ${Object.keys(cedict).length} CEDICT entries`);
} else {
  console.log('CC-CEDICT not found. Run "npm run download-cedict" first for full data.');
  console.log('Seeding with built-in fallback data...');
}

// Example sentences for common HSK 1 words (built-in fallback)
const EXAMPLE_SENTENCES = {
  "你好": [
    { chinese: "你好！你叫什么名字？", pinyin: "Nǐ hǎo! Nǐ jiào shénme míngzi?", english: "Hello! What's your name?" }
  ],
  "谢谢": [
    { chinese: "谢谢你的帮助。", pinyin: "Xièxiè nǐ de bāngzhù.", english: "Thank you for your help." }
  ],
  "再见": [
    { chinese: "再见！明天见。", pinyin: "Zàijiàn! Míngtiān jiàn.", english: "Goodbye! See you tomorrow." }
  ],
  "吃": [
    { chinese: "我想吃米饭。", pinyin: "Wǒ xiǎng chī mǐfàn.", english: "I want to eat rice." },
    { chinese: "你吃早饭了吗？", pinyin: "Nǐ chī zǎofàn le ma?", english: "Have you eaten breakfast?" }
  ],
  "喝": [
    { chinese: "你喝咖啡还是茶？", pinyin: "Nǐ hē kāfēi háishi chá?", english: "Do you drink coffee or tea?" }
  ],
  "水": [
    { chinese: "请给我一杯水。", pinyin: "Qǐng gěi wǒ yī bēi shuǐ.", english: "Please give me a glass of water." }
  ],
  "爱": [
    { chinese: "我爱我的家人。", pinyin: "Wǒ ài wǒ de jiārén.", english: "I love my family." },
    { chinese: "他爱听音乐。", pinyin: "Tā ài tīng yīnyuè.", english: "He loves listening to music." }
  ],
  "学习": [
    { chinese: "我每天都在学习中文。", pinyin: "Wǒ měitiān dōu zài xuéxí Zhōngwén.", english: "I study Chinese every day." }
  ],
  "工作": [
    { chinese: "你在哪里工作？", pinyin: "Nǐ zài nǎlǐ gōngzuò?", english: "Where do you work?" }
  ],
  "朋友": [
    { chinese: "她是我最好的朋友。", pinyin: "Tā shì wǒ zuì hǎo de péngyou.", english: "She is my best friend." }
  ],
};

// Component meanings for common characters
const COMPONENTS = {
  "爱": [{ hanzi: "爪", meaning: "claw" }, { hanzi: "心", meaning: "heart" }, { hanzi: "友", meaning: "friend" }],
  "好": [{ hanzi: "女", meaning: "woman" }, { hanzi: "子", meaning: "child" }],
  "明": [{ hanzi: "日", meaning: "sun" }, { hanzi: "月", meaning: "moon" }],
  "学": [{ hanzi: "子", meaning: "child" }, { hanzi: "冖", meaning: "roof" }],
  "字": [{ hanzi: "子", meaning: "child" }, { hanzi: "宀", meaning: "roof" }],
  "家": [{ hanzi: "宀", meaning: "roof" }, { hanzi: "豕", meaning: "pig" }],
  "国": [{ hanzi: "囗", meaning: "enclosure" }, { hanzi: "玉", meaning: "jade" }],
  "语": [{ hanzi: "讠", meaning: "speech" }, { hanzi: "吾", meaning: "I/me" }],
  "话": [{ hanzi: "讠", meaning: "speech" }, { hanzi: "舌", meaning: "tongue" }],
};

// Pinyin tone-mark conversion (for words not in CEDICT)
const PINYIN_FALLBACK = {
  "你好": "nǐ hǎo", "谢谢": "xièxiè", "再见": "zàijiàn", "我": "wǒ", "你": "nǐ",
  "他": "tā", "她": "tā", "们": "men", "我们": "wǒmen", "你们": "nǐmen",
  "是": "shì", "不是": "bù shì", "有": "yǒu", "没有": "méiyǒu", "吃": "chī",
  "喝": "hē", "水": "shuǐ", "饭": "fàn", "好": "hǎo", "爱": "ài",
  "大": "dà", "小": "xiǎo", "多": "duō", "少": "shǎo", "来": "lái", "去": "qù",
  "上": "shàng", "下": "xià", "中": "zhōng", "国": "guó", "人": "rén",
  "学": "xué", "生": "shēng", "老师": "lǎoshī", "学生": "xuéshēng",
  "学习": "xuéxí", "工作": "gōngzuò", "朋友": "péngyou", "家": "jiā",
};

function generateExamples(hanzi, meanings, pinyin) {
  // Return built-in examples if available
  if (EXAMPLE_SENTENCES[hanzi]) return EXAMPLE_SENTENCES[hanzi];

  // Generate natural fallback examples when no curated sentence exists
  const wordPinyin = pinyin || hanzi;
  const firstMeaning = (meanings[0] || hanzi).split('/')[0].split('(')[0].trim();

  return [
    {
      chinese: `我想更好地理解“${hanzi}”这个词。`,
      pinyin: `Wǒ xiǎng gèng hǎo de lǐjiě "${wordPinyin}" zhège cí.`,
      english: `I want to better understand the word "${firstMeaning || hanzi}".`
    },
    {
      chinese: `老师让我们用“${hanzi}”造句。`,
      pinyin: `Lǎoshī ràng wǒmen yòng "${wordPinyin}" zàojù.`,
      english: `The teacher asked us to make a sentence with "${firstMeaning || hanzi}".`
    },
  ];
}

function getComponents(hanzi) {
  // Return known components or split multi-character words
  if (COMPONENTS[hanzi]) return COMPONENTS[hanzi];
  if (hanzi.length > 1) {
    return hanzi.split('').map(char => ({
      hanzi: char,
      meaning: cedict[char]?.meanings?.[0] || '(component)'
    }));
  }
  return [];
}

// Insert decks
const deckNames = {
  1: 'HSK 1 — Beginner',
  2: 'HSK 2 — Elementary',
  3: 'HSK 3 — Pre-Intermediate',
  4: 'HSK 4 — Intermediate',
  5: 'HSK 5 — Upper Intermediate',
  6: 'HSK 6 — Advanced',
};

const insertDeck = db.prepare(`
  INSERT OR IGNORE INTO decks (hsk_level, name) VALUES (?, ?)
`);
const insertCard = db.prepare(`
  INSERT INTO cards (hanzi, pinyin, meanings, hsk_level, examples, components, tags)
  VALUES (?, ?, ?, ?, ?, ?, ?)
  ON CONFLICT(hanzi, hsk_level) DO UPDATE SET
    pinyin = excluded.pinyin,
    meanings = excluded.meanings,
    examples = excluded.examples,
    components = excluded.components,
    tags = excluded.tags
`);
const countCards = db.prepare(`SELECT COUNT(*) AS count FROM cards`);

if (shouldReset) {
  console.log('Reset mode enabled: clearing decks and cards...');
  db.exec('DELETE FROM user_card_progress; DELETE FROM cards; DELETE FROM decks;');
}

const beforeTotal = countCards.get().count;
let totalSynced = 0;

for (const [level, words] of Object.entries(HSK_WORDS)) {
  const hskLevel = parseInt(level);
  insertDeck.run(hskLevel, deckNames[hskLevel]);

  let levelCount = 0;
  for (const hanzi of words) {
    const entry = cedict[hanzi];
    const pinyin = entry?.pinyin || PINYIN_FALLBACK[hanzi] || hanzi;
    const meanings = entry?.meanings || [`[${hanzi}]`];
    const examples = generateExamples(hanzi, meanings, pinyin);
    const components = getComponents(hanzi);
    const tags = [`hsk${hskLevel}`];

    const result = insertCard.run(
      hanzi,
      pinyin,
      JSON.stringify(meanings.slice(0, 5)),
      hskLevel,
      JSON.stringify(examples),
      JSON.stringify(components),
      JSON.stringify(tags)
    );
    if (result.changes > 0) levelCount++;
  }

  console.log(`HSK ${hskLevel}: synced ${levelCount}/${words.length} cards`);
  totalSynced += levelCount;
}

const afterTotal = countCards.get().count;
const insertedThisRun = Math.max(0, afterTotal - beforeTotal);
console.log(`\nSeed complete!`);
console.log(`Cards synced this run: ${totalSynced}`);
console.log(`New cards inserted this run: ${insertedThisRun}`);
console.log(`Total cards in database: ${afterTotal}`);
if (!shouldReset && insertedThisRun === 0 && afterTotal > 0) {
  console.log('No new cards were inserted because the database is already seeded.');
  console.log('Use "npm run seed:reset" for a fresh rebuild.');
}
if (beforeTotal === 0 && afterTotal === 0) {
  console.log('Warning: database is still empty. Check src/seed/hsk-words.js and seed logs above.');
}
db.close();
