import { motion } from 'framer-motion';

export default function SessionSummary({ results, duration, onDone, onStudyMore }) {
  const total = results.length;
  const correct = results.filter(r => r.rating >= 2).length;
  const accuracy = total > 0 ? Math.round((correct / total) * 100) : 0;
  const mins = Math.floor(duration / 60);
  const secs = duration % 60;

  const byRating = [0, 0, 0, 0];
  results.forEach(r => byRating[r.rating]++);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="surface p-8 space-y-6 text-center"
    >
      <div>
        <div className="text-5xl mb-2">
          {accuracy >= 80 ? '🎊' : accuracy >= 60 ? '👍' : '💪'}
        </div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Session complete!</h2>
        <p className="text-gray-500 dark:text-gray-400 mt-1">
          {mins > 0 ? `${mins}m ` : ''}{secs}s study time
        </p>
      </div>

      {/* Accuracy circle */}
      <div className="flex items-center justify-center">
        <div className="relative w-32 h-32">
          <svg className="w-32 h-32 -rotate-90" viewBox="0 0 120 120">
            <circle cx="60" cy="60" r="50" fill="none" stroke="currentColor" strokeWidth="8" className="text-gray-200 dark:text-gray-700" />
            <motion.circle
              cx="60" cy="60" r="50"
              fill="none"
              stroke={accuracy >= 80 ? '#22c55e' : accuracy >= 60 ? '#f59e0b' : '#ef4444'}
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={`${Math.PI * 100}`}
              initial={{ strokeDashoffset: Math.PI * 100 }}
              animate={{ strokeDashoffset: Math.PI * 100 * (1 - accuracy / 100) }}
              transition={{ duration: 1, ease: 'easeOut' }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-3xl font-bold text-gray-900 dark:text-gray-100">{accuracy}%</span>
            <span className="text-xs text-gray-500">accuracy</span>
          </div>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-3 text-left">
        <StatRow label="Cards reviewed" value={total} />
        <StatRow label="Recalled correctly" value={correct} />
        <StatRow label="Again" value={byRating[0]} color="text-red-600 dark:text-red-400" />
        <StatRow label="Hard" value={byRating[1]} color="text-orange-600 dark:text-orange-400" />
        <StatRow label="Good" value={byRating[2]} color="text-green-600 dark:text-green-400" />
        <StatRow label="Easy" value={byRating[3]} color="text-blue-600 dark:text-blue-400" />
      </div>

      {/* Card list */}
      <div className="text-left space-y-2 max-h-48 overflow-y-auto">
        {results.map(({ card, rating }, i) => (
          <div key={i} className="flex items-center justify-between py-1.5 border-b border-gray-100 dark:border-gray-800 last:border-0">
            <span className="font-chinese text-lg font-bold text-gray-800 dark:text-gray-200">{card.hanzi}</span>
            <span className="text-sm text-gray-500 dark:text-gray-400">{card.pinyin}</span>
            <RatingPill rating={rating} />
          </div>
        ))}
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <button onClick={onStudyMore} className="flex-1 py-3 rounded-xl border-2 border-brand-200 dark:border-brand-900 text-brand-600 dark:text-brand-400 font-semibold hover:bg-brand-50 dark:hover:bg-brand-900/20 transition-colors">
          Study more
        </button>
        <button onClick={onDone} className="flex-1 py-3 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-semibold transition-colors">
          Done
        </button>
      </div>
    </motion.div>
  );
}

function StatRow({ label, value, color }) {
  return (
    <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-3">
      <div className={`text-xl font-bold ${color || 'text-gray-900 dark:text-gray-100'}`}>{value}</div>
      <div className="text-xs text-gray-500 dark:text-gray-400">{label}</div>
    </div>
  );
}

function RatingPill({ rating }) {
  const labels = ['Again', 'Hard', 'Good', 'Easy'];
  const classes = [
    'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
    'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
    'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
    'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  ];
  return <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${classes[rating]}`}>{labels[rating]}</span>;
}
