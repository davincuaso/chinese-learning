const BASE = '/api';

async function fetchJSON(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
}

export const api = {
  // Decks
  getDecks: () => fetchJSON('/decks'),
  getDeck: (level) => fetchJSON(`/decks/${level}`),

  // Cards
  getCards: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return fetchJSON(`/cards?${q}`);
  },
  getCard: (id) => fetchJSON(`/cards/${id}`),
  getDueCards: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return fetchJSON(`/cards/session/due?${q}`);
  },
  getNewCards: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return fetchJSON(`/cards/session/new?${q}`);
  },

  // Reviews
  submitReview: (card_id, rating) => fetchJSON('/reviews', {
    method: 'POST',
    body: JSON.stringify({ card_id, rating }),
  }),
  getStats: () => fetchJSON('/reviews/stats'),

  // Sessions
  logSession: (data) => fetchJSON('/sessions', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  getSessions: (days = 365) => fetchJSON(`/sessions?days=${days}`),
  getTodaySession: () => fetchJSON('/sessions/today'),

  // TTS
  getTtsEngine: () => fetchJSON('/tts/engine'),
  getTtsVoices: () => fetchJSON('/tts/voices'),
  getTtsCache: () => fetchJSON('/tts/cache'),
  clearTtsCache: () => fetchJSON('/tts/cache', { method: 'DELETE' }),

  // Returns a Blob URL for the audio, or null if webspeech fallback
  synthesizeTts: async (text, voice, speed = 'normal') => {
    const res = await fetch(`${BASE}/tts/synthesize`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, voice, speed }),
    });
    if (!res.ok) throw new Error(`TTS HTTP ${res.status}`);
    const contentType = res.headers.get('Content-Type') || '';
    if (contentType.includes('application/json')) {
      const data = await res.json();
      return { engine: data.engine, url: null };
    }
    const blob = await res.blob();
    return { engine: res.headers.get('X-TTS-Engine') || 'edge-tts', url: URL.createObjectURL(blob) };
  },
};
