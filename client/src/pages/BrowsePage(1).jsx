import { useState, useEffect, useCallback } from 'react';
import { api } from '../lib/api';
import HskBadge from '../components/Card/HskBadge';
import { useSpeech } from '../hooks/useSpeech';
import HanziWriterCard from '../components/Card/HanziWriter';
import { useStore } from '../store/useStore';

export default function BrowsePage() {
  const [cards, setCards] = useState([]);
  const [search, setSearch] = useState('');
  const [level, setLevel] = useState('');
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState(null);
  const darkMode = useStore(s => s.darkMode);
  const { speak } = useSpeech();
  const LIMIT = 30;

  const load = useCallback(async (reset = false) => {
    setLoading(true);
    try {
      const params = { limit: LIMIT, offset: reset ? 0 : page * LIMIT };
      if (search) params.search = search;
      if (level) params.hsk_level = level;
      const data = await api.getCards(params);
      if (reset) { setCards(data); setPage(0); }
      else setCards(prev => [...prev, ...data]);
    } finally {
      setLoading(false);
    }
  }, [search, level, page]);

  useEffect(() => { load(true); }, [search, level]);

  return (
    <div className="space-y-4 animate-fade-in">
      <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Vocabulary browser</h1>

      {/* Filters */}
      <div className="flex gap-2">
        <input
          type="search"
          placeholder="Search hanzi, pinyin, meaning..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="flex-1 px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
        />
        <select
          value={level}
          onChange={e => setLevel(e.target.value)}
          className="px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
        >
          <option value="">All levels</option>
          {[1,2,3,4,5,6].map(l => <option key={l} value={l}>HSK {l}</option>)}
        </select>
      </div>

      {/* Card grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
        {cards.map(card => (
          <button
            key={card.id}
            onClick={() => setSelected(card)}
            className="surface p-3 text-left hover:shadow-md transition-shadow"
          >
            <div className="font-chinese text-2xl font-bold text-gray-900 dark:text-gray-100 mb-1">{card.hanzi}</div>
            <div className="text-xs text-blue-600 dark:text-blue-400 mb-1">{card.pinyin}</div>
            <div className="text-xs text-gray-600 dark:text-gray-400 truncate">
              {Array.isArray(card.meanings) ? card.meanings[0] : card.meanings}
            </div>
            <div className="mt-1.5">
              <HskBadge level={card.hsk_level} />
            </div>
          </button>
        ))}
      </div>

      {loading && <div className="text-center py-4 text-gray-500">Loading...</div>}

      {!loading && cards.length > 0 && cards.length % LIMIT === 0 && (
        <button
          onClick={() => { setPage(p => p + 1); load(false); }}
          className="w-full py-2 text-sm text-brand-600 dark:text-brand-400 hover:underline"
        >
          Load more
        </button>
      )}

      {/* Detail modal */}
      {selected && (
        <CardModal card={selected} darkMode={darkMode} onClose={() => setSelected(null)} speak={speak} />
      )}
    </div>
  );
}

function CardModal({ card, darkMode, onClose, speak }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-lg max-h-[85vh] overflow-y-auto p-6 space-y-4 shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-start justify-between">
          <HskBadge level={card.hsk_level} />
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">✕</button>
        </div>

        <div className="text-center space-y-2">
          <div className="font-chinese text-7xl font-bold text-gray-900 dark:text-gray-100">{card.hanzi}</div>
          <button onClick={() => speak(card.hanzi)} className="text-blue-500 hover:text-blue-700 text-sm">
            🔊 {card.pinyin}
          </button>
        </div>

        <HanziWriterCard hanzi={card.hanzi} dark={darkMode} size={130} />

        <div className="space-y-1">
          {(Array.isArray(card.meanings) ? card.meanings : [card.meanings]).map((m, i) => (
            <p key={i} className={`${i === 0 ? 'font-semibold text-gray-900 dark:text-gray-100' : 'text-sm text-gray-600 dark:text-gray-400'}`}>
              {i > 0 && '• '}{m}
            </p>
          ))}
        </div>

        {Array.isArray(card.examples) && card.examples.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-semibold text-gray-500 uppercase">Examples</p>
            {card.examples.map((ex, i) => (
              <div key={i} className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-3 space-y-0.5">
                <p className="font-chinese font-medium text-gray-900 dark:text-gray-100">{ex.chinese}</p>
                <p className="text-sm text-blue-600 dark:text-blue-400">{ex.pinyin}</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">{ex.english}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
