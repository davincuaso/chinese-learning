#!/usr/bin/env node
// Downloads and parses CC-CEDICT into a usable JSON file for the seed script.
// Source: https://www.mdbg.net/chinese/dictionary?page=cc-cedict (CC BY-SA 3.0)

const https = require('https');
const zlib = require('zlib');
const fs = require('fs');
const path = require('path');

const OUTPUT = path.join(__dirname, '../../data/cedict_parsed.json');
const CEDICT_URL = 'https://www.mdbg.net/chinese/export/cedict/cedict_1_0_ts_utf-8_mdbg.txt.gz';

function downloadCedict() {
  return new Promise((resolve, reject) => {
    console.log('Downloading CC-CEDICT...');
    const req = https.get(CEDICT_URL, (res) => {
      if (res.statusCode !== 200) {
        reject(new Error(`HTTP ${res.statusCode}`));
        return;
      }
      const chunks = [];
      const gunzip = zlib.createGunzip();
      res.pipe(gunzip);
      gunzip.on('data', c => chunks.push(c));
      gunzip.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
      gunzip.on('error', reject);
    });
    req.on('error', reject);
  });
}

function parseCedict(raw) {
  const dict = {};
  let count = 0;

  for (const line of raw.split('\n')) {
    if (line.startsWith('#') || !line.trim()) continue;

    // Format: Traditional Simplified [pinyin] /def1/def2/
    const match = line.match(/^(\S+)\s+(\S+)\s+\[([^\]]+)\]\s+\/(.+)\/\s*$/);
    if (!match) continue;

    const [, traditional, simplified, pinyin, defsStr] = match;
    const meanings = defsStr.split('/').map(d => d.trim()).filter(Boolean);

    // Use simplified as the key; store both
    if (!dict[simplified]) {
      dict[simplified] = {
        hanzi: simplified,
        traditional,
        pinyin: formatPinyin(pinyin),
        pinyin_raw: pinyin,
        meanings,
      };
      count++;
    }
  }

  console.log(`Parsed ${count} entries from CC-CEDICT`);
  return dict;
}

// Convert numeric pinyin (hao3) to tone-marked pinyin (hǎo)
function formatPinyin(raw) {
  const toneMap = {
    a: ['ā','á','ǎ','à','a'],
    e: ['ē','é','ě','è','e'],
    i: ['ī','í','ǐ','ì','i'],
    o: ['ō','ó','ǒ','ò','o'],
    u: ['ū','ú','ǔ','ù','u'],
    ü: ['ǖ','ǘ','ǚ','ǜ','ü'],
    v: ['ǖ','ǘ','ǚ','ǜ','ü'],
  };

  return raw.split(' ').map(syllable => {
    const toneNum = parseInt(syllable.slice(-1));
    if (isNaN(toneNum) || toneNum < 1 || toneNum > 5) return syllable;
    const base = syllable.slice(0, -1).toLowerCase().replace('u:', 'ü');
    if (toneNum === 5) return base; // neutral tone

    // Find the vowel to tone-mark (priority: a/e > ou > last vowel)
    for (const v of ['a','e','ou']) {
      if (base.includes(v)) {
        const vowel = v === 'ou' ? 'o' : v;
        return base.replace(vowel, toneMap[vowel]?.[toneNum - 1] || vowel);
      }
    }
    // Last vowel
    for (let i = base.length - 1; i >= 0; i--) {
      const c = base[i];
      if (toneMap[c]) {
        return base.slice(0, i) + toneMap[c][toneNum - 1] + base.slice(i + 1);
      }
    }
    return base;
  }).join(' ');
}

async function main() {
  try {
    fs.mkdirSync(path.dirname(OUTPUT), { recursive: true });
    const raw = await downloadCedict();
    const dict = parseCedict(raw);
    fs.writeFileSync(OUTPUT, JSON.stringify(dict));
    console.log(`Saved to ${OUTPUT}`);
  } catch (err) {
    console.error('Failed to download/parse CC-CEDICT:', err.message);
    console.log('\nManual download option:');
    console.log('1. Visit https://www.mdbg.net/chinese/dictionary?page=cc-cedict');
    console.log('2. Download cedict_1_0_ts_utf-8_mdbg.txt.gz');
    console.log('3. Gunzip it and place as server/data/cedict.txt');
    process.exit(1);
  }
}

main();

module.exports = { parseCedict, formatPinyin };
