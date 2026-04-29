import { useEffect, useState } from 'react';
import { api } from '../lib/api';

export default function StatsPage() {
  const [stats, setStats] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.getStats(), api.getSessions(365)])
      .then(([s, sess]) => { setStats(s); setSessions(sess); })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex justify-center pt-20"><div className="w-8 h-8 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-6 animate-fade-in">
      <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Your progress</h1>

      {/* Overview */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <BigStat label="Total cards" value={stats.totalCards} />
          <BigStat label="Studied" value={stats.studied} />
          <BigStat label="New / unseen" value={stats.newUnseen} />
          <BigStat label="Due today" value={stats.due} accent="brand" />
          <BigStat label="Retention rate" value={`${stats.retention_rate}%`} accent="green" />
          <BigStat label="Day streak" value={`${stats.streak} 🔥`} accent="amber" />
        </div>
      )}

      {/* Study heatmap */}
      <div className="surface p-5 space-y-4">
        <h2 className="font-semibold text-gray-800 dark:text-gray-200">Study activity</h2>
        <Heatmap sessions={sessions} />
        <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
          <span>Less</span>
          {[0,1,2,3,4].map(i => (
            <div key={i} className={`w-3 h-3 rounded-sm ${heatColor(i * 5)}`} />
          ))}
          <span>More</span>
        </div>
      </div>

      {/* Recent sessions */}
      <div className="surface p-5 space-y-3">
        <h2 className="font-semibold text-gray-800 dark:text-gray-200">Recent sessions</h2>
        {sessions.length === 0 ? (
          <p className="text-gray-500 dark:text-gray-400 text-sm">No sessions yet. Start studying!</p>
        ) : (
          <div className="space-y-2">
            {[...sessions].reverse().slice(0, 10).map(s => (
              <SessionRow key={s.id} session={s} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Heatmap({ sessions }) {
  // Build a map of date → cards_reviewed
  const map = {};
  sessions.forEach(s => { map[s.date] = (map[s.date] || 0) + s.cards_reviewed; });

  // Generate last 52 weeks * 7 days grid
  const weeks = [];
  const today = new Date();
  const start = new Date(today);
  start.setDate(start.getDate() - 364);
  // align to Sunday
  start.setDate(start.getDate() - start.getDay());

  let d = new Date(start);
  for (let w = 0; w < 53; w++) {
    const week = [];
    for (let day = 0; day < 7; day++) {
      const dateStr = d.toISOString().split('T')[0];
      week.push({ date: dateStr, count: map[dateStr] || 0 });
      d.setDate(d.getDate() + 1);
    }
    weeks.push(week);
  }

  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const maxCount = Math.max(...Object.values(map), 1);

  return (
    <div className="overflow-x-auto">
      <div className="flex gap-0.5 min-w-fit">
        {weeks.map((week, wi) => (
          <div key={wi} className="flex flex-col gap-0.5">
            {week.map(({ date, count }) => (
              <div
                key={date}
                title={count > 0 ? `${date}: ${count} cards` : date}
                className={`w-3 h-3 rounded-sm transition-colors ${heatColor(Math.round((count / maxCount) * 20))}`}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function heatColor(intensity) {
  if (intensity === 0) return 'bg-gray-100 dark:bg-gray-800';
  if (intensity <= 4) return 'bg-brand-100 dark:bg-brand-900/30';
  if (intensity <= 9) return 'bg-brand-300 dark:bg-brand-700/50';
  if (intensity <= 15) return 'bg-brand-500 dark:bg-brand-600/70';
  return 'bg-brand-700 dark:bg-brand-500';
}

function BigStat({ label, value, accent }) {
  const colors = {
    brand: 'text-brand-600 dark:text-brand-400',
    green: 'text-green-600 dark:text-green-400',
    amber: 'text-amber-600 dark:text-amber-400',
    default: 'text-gray-900 dark:text-gray-100',
  };
  return (
    <div className="surface p-4">
      <div className={`text-2xl font-bold ${colors[accent] || colors.default}`}>{value}</div>
      <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{label}</div>
    </div>
  );
}

function SessionRow({ session }) {
  const acc = session.cards_reviewed > 0
    ? Math.round((session.cards_correct / session.cards_reviewed) * 100)
    : 0;
  const mins = Math.floor(session.duration_seconds / 60);
  const secs = session.duration_seconds % 60;
  return (
    <div className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-800 last:border-0">
      <span className="text-sm text-gray-700 dark:text-gray-300">{session.date}</span>
      <span className="text-sm text-gray-500">{session.cards_reviewed} cards</span>
      <span className={`text-sm font-medium ${acc >= 80 ? 'text-green-600 dark:text-green-400' : acc >= 60 ? 'text-amber-600 dark:text-amber-400' : 'text-red-600 dark:text-red-400'}`}>{acc}%</span>
      <span className="text-xs text-gray-400">{mins > 0 ? `${mins}m ` : ''}{secs}s</span>
    </div>
  );
}
