const { execFile, exec } = require('child_process');
const { createHash } = require('crypto');
const https = require('https');
const fs = require('fs');
const path = require('path');
const { promisify } = require('util');

const execFileAsync = promisify(execFile);
const CACHE_DIR = path.join(__dirname, '../../audio_cache');
fs.mkdirSync(CACHE_DIR, { recursive: true });

// ─── Engine detection ──────────────────────────────────────────────────────

let activeEngine = null; // 'edge-tts' | 'azure' | 'webspeech'
let engineDetected = false;

async function detectEngine() {
  if (engineDetected) return activeEngine;

  // Level 1: edge-tts
  try {
    await execFileAsync('python3', ['-c', 'import edge_tts'], { timeout: 5000 });
    activeEngine = 'edge-tts';
    console.log('[TTS] Engine: edge-tts (Level 1 — Azure Neural quality, free)');
  } catch {
    // Level 2: Azure
    if (process.env.AZURE_SPEECH_KEY && process.env.AZURE_SPEECH_REGION) {
      activeEngine = 'azure';
      console.warn('[TTS] Warning: edge-tts not found, falling back to Azure Cognitive Services (Level 2)');
    } else {
      activeEngine = 'webspeech';
      console.warn('[TTS] Warning: edge-tts not found and no Azure key set, falling back to browser Web Speech API (Level 3)');
    }
  }

  engineDetected = true;
  return activeEngine;
}

// ─── Cache helpers ─────────────────────────────────────────────────────────

function cacheKey(text, voice, speed) {
  return createHash('sha256').update(`${text}|${voice}|${speed}`).digest('hex');
}

function cachePath(key) {
  return path.join(CACHE_DIR, `${key}.mp3`);
}

function cacheMetaPath(key) {
  return path.join(CACHE_DIR, `${key}.json`);
}

function isCached(key) {
  return fs.existsSync(cachePath(key)) && fs.statSync(cachePath(key)).size > 0;
}

function writeMeta(key, text, voice, speed) {
  fs.writeFileSync(cacheMetaPath(key), JSON.stringify({
    text, voice, speed,
    created_at: new Date().toISOString(),
  }));
}

// ─── Level 1: edge-tts ────────────────────────────────────────────────────

const EDGE_VOICES = [
  { id: 'zh-CN-XiaoxiaoNeural', label: 'Xiaoxiao (female, warm)' },
  { id: 'zh-CN-YunxiNeural',    label: 'Yunxi (male, clear)' },
  { id: 'zh-CN-YunjianNeural',  label: 'Yunjian (male, casual)' },
  { id: 'zh-CN-XiaoyiNeural',   label: 'Xiaoyi (female, expressive)' },
];
const DEFAULT_EDGE_VOICE = 'zh-CN-XiaoxiaoNeural';

async function generateEdgeTTS(text, voice, speed, outPath) {
  const rate = speed === 'slow' ? '-25%' : '+0%';
  const safeVoice = EDGE_VOICES.some(v => v.id === voice) ? voice : DEFAULT_EDGE_VOICE;

  await execFileAsync('python3', [
    '-m', 'edge_tts',
    '--voice', safeVoice,
    '--rate', rate,
    '--text', text,
    '--write-media', outPath,
  ], { timeout: 30000 });
}

// ─── Level 2: Azure Cognitive Services ───────────────────────────────────

async function generateAzureTTS(text, voice, speed, outPath) {
  const key = process.env.AZURE_SPEECH_KEY;
  const region = process.env.AZURE_SPEECH_REGION || 'eastus';
  const azureVoice = 'zh-CN-XiaoxiaoNeural';
  const rate = speed === 'slow' ? '-25%' : '0%';

  const ssml = `<speak version='1.0' xml:lang='zh-CN'>
    <voice name='${azureVoice}'>
      <prosody rate='${rate}'>${text.replace(/[<>&"']/g, c => ({ '<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;',"'":'&apos;' })[c])}</prosody>
    </voice>
  </speak>`;

  const tokenUrl = `https://${region}.api.cognitive.microsoft.com/sts/v1.0/issueToken`;
  const token = await httpsPost(tokenUrl, '', {
    'Ocp-Apim-Subscription-Key': key,
    'Content-Type': 'application/x-www-form-urlencoded',
  });

  const ttsUrl = `https://${region}.tts.speech.microsoft.com/cognitiveservices/v1`;
  const audioBuffer = await httpsPostBinary(ttsUrl, ssml, {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/ssml+xml',
    'X-Microsoft-OutputFormat': 'audio-16khz-32kbitrate-mono-mp3',
  });

  fs.writeFileSync(outPath, audioBuffer);
}

function httpsPost(url, body, headers) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const req = https.request({ hostname: u.hostname, path: u.pathname, method: 'POST', headers }, (res) => {
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => {
        if (res.statusCode !== 200) reject(new Error(`HTTP ${res.statusCode}: ${Buffer.concat(chunks).toString()}`));
        else resolve(Buffer.concat(chunks).toString());
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

function httpsPostBinary(url, body, headers) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const req = https.request({
      hostname: u.hostname, path: u.pathname + u.search,
      method: 'POST',
      headers: { ...headers, 'Content-Length': Buffer.byteLength(body) },
    }, (res) => {
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => {
        if (res.statusCode !== 200) reject(new Error(`Azure TTS HTTP ${res.statusCode}: ${Buffer.concat(chunks).toString()}`));
        else resolve(Buffer.concat(chunks));
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

// ─── Public API ───────────────────────────────────────────────────────────

/**
 * Generate or retrieve cached TTS audio.
 * Returns { filePath, engine, fromCache }
 */
async function synthesize(text, voice, speed = 'normal') {
  const engine = await detectEngine();
  if (engine === 'webspeech') {
    return { engine: 'webspeech', filePath: null, fromCache: false };
  }

  const key = cacheKey(text, voice || DEFAULT_EDGE_VOICE, speed);
  const mp3 = cachePath(key);

  if (isCached(key)) {
    return { engine, filePath: mp3, fromCache: true };
  }

  const safeVoice = voice || DEFAULT_EDGE_VOICE;
  if (engine === 'edge-tts') {
    await generateEdgeTTS(text, safeVoice, speed, mp3);
  } else {
    await generateAzureTTS(text, safeVoice, speed, mp3);
  }

  writeMeta(key, text, safeVoice, speed);
  return { engine, filePath: mp3, fromCache: false };
}

/**
 * Pre-generate audio for a list of texts silently in the background.
 */
async function prewarm(items) {
  const engine = await detectEngine();
  if (engine === 'webspeech') return;
  console.log(`[TTS] Pre-warming ${items.length} audio files...`);
  for (const { text, voice, speed } of items) {
    try {
      await synthesize(text, voice, speed);
    } catch (e) {
      console.warn(`[TTS] Pre-warm failed for "${text}":`, e.message);
    }
  }
  console.log('[TTS] Pre-warm complete');
}

/**
 * List all cached entries.
 */
function listCache() {
  const files = fs.readdirSync(CACHE_DIR).filter(f => f.endsWith('.json'));
  return files.map(f => {
    try {
      return JSON.parse(fs.readFileSync(path.join(CACHE_DIR, f), 'utf8'));
    } catch {
      return null;
    }
  }).filter(Boolean);
}

/**
 * Clear all cached audio files.
 */
function clearCache() {
  const files = fs.readdirSync(CACHE_DIR).filter(f => f.endsWith('.mp3') || f.endsWith('.json'));
  files.forEach(f => fs.unlinkSync(path.join(CACHE_DIR, f)));
  return files.length;
}

module.exports = {
  detectEngine,
  synthesize,
  prewarm,
  listCache,
  clearCache,
  EDGE_VOICES,
  DEFAULT_EDGE_VOICE,
  CACHE_DIR,
};
