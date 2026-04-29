const LEVEL_COLORS = [
  '',
  'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300',
  'bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-300',
  'bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-300',
  'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
  'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300',
  'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
];

export default function HskBadge({ level }) {
  return (
    <span className={`hsk-badge ${LEVEL_COLORS[level] || LEVEL_COLORS[1]}`}>
      HSK {level}
    </span>
  );
}
