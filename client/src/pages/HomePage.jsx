import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { api } from '../lib/api';
import { useStore } from '../store/useStore';

const LEVEL_COLORS = ['','emerald','sky','violet','amber','orange','red'];

export default function HomePage() {
  const navigate = useNavigate();
  const [decks, setDecks] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const { selectedLevels, setSelectedLevels, batchSize } = useStore();

  useEffect(() => {
    Promise.all([api.getDecks(), api.getStats()])
      .then(([d, s]) => { setDecks(d); setStats(s); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const totalDue = decks.filter(d => selectedLevels.includes(d.hsk_level)).reduce((s, d) => s + d.due_count, 0);

  const toggleLevel = (level) => {
    setSelectedLevels(
      selectedLevels.includes(level)
        ? selectedLevels.filter(l => l !== level)
        : [...selectedLevels, level].sort()
    );
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Hero stats */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard label="Due today" value={stats.due} accent="brand" />
          <StatCard label="Streak" value={`${stats.streak}d`} accent="amber" />
          <StatCard label="Retention" value={`${stats.retention_rate}%`} accent="green" />
          <StatCard label="Studied" value={stats.studied} accent="sky" />
        </div>
      )}

      {/* Start session CTA */}
      <motion.button
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.99 }}
        onClick={() => navigate('/study')}
        disabled={selectedLevels.length === 0}
        className="w-full py-4 rounded-2xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-lg
                   shadow-lg shadow-brand-200 dark:shadow-brand-900/30 transition-colors disabled:opacity-50"
      >
        {totalDue > 0 ? `Study now — ${totalDue} due` : 'Start new cards'}
      </motion.button>

      {/* Level selector */}
      <div className="surface p-5 space-y-4">
        <h2 className="font-semibold text-gray-800 dark:text-gray-200">Select HSK levels</h2>
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
          {decks.map(deck => {
            const active = selectedLevels.includes(deck.hsk_level);
            const color = LEVEL_COLORS[deck.hsk_level];
            return (
              <button
                key={deck.hsk_level}
                onClick={() => toggleLevel(deck.hsk_level)}
                className={`rounded-xl p-3 text-center transition-all border-2 ${
                  active
                    ? `border-${color}-400 bg-${color}-50 dark:bg-${color}-900/20`
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                <div className="font-bold text-gray-900 dark:text-gray-100">HSK {deck.hsk_level}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">{deck.card_count} cards</div>
                {deck.due_count > 0 && (
                  <div className={`text-xs font-semibold text-${color}-600 dark:text-${color}-400`}>{deck.due_count} due</div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-2 gap-3">
        <button onClick={() => navigate('/browse')} className="surface p-4 text-left hover:shadow-md transition-shadow">
          <div className="text-2xl mb-1">📖</div>
          <div className="font-semibold text-gray-800 dark:text-gray-200">Browse vocabulary</div>
          <div className="text-sm text-gray-500">Search all HSK words</div>
        </button>
        <button onClick={() => navigate('/stats')} className="surface p-4 text-left hover:shadow-md transition-shadow">
          <div className="text-2xl mb-1">📊</div>
          <div className="font-semibold text-gray-800 dark:text-gray-200">Your progress</div>
          <div className="text-sm text-gray-500">Streak & heatmap</div>
        </button>
      </div>
    </div>
  );
}

function StatCard({ label, value, accent }) {
  const colors = {
    brand: 'text-brand-600 dark:text-brand-400',
    amber: 'text-amber-600 dark:text-amber-400',
    green: 'text-green-600 dark:text-green-400',
    sky: 'text-sky-600 dark:text-sky-400',
  };
  return (
    <div className="surface p-4 text-center">
      <div className={`text-2xl font-bold ${colors[accent]}`}>{value}</div>
      <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{label}</div>
    </div>
  );
}

function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin" />
    </div>
  );
}
