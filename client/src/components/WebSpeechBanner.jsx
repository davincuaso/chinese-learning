import { useState } from 'react';
import { useStore } from '../store/useStore';

export default function WebSpeechBanner({ onOpenSetup }) {
  const [dismissed, setDismissed] = useState(false);
  const detectedEngine = useStore(s => s.detectedEngine);

  if (dismissed || detectedEngine !== 'webspeech') return null;

  return (
    <div className="mb-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl px-4 py-3 flex items-start gap-3">
      <span className="text-amber-500 text-lg mt-0.5">🔊</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
          Upgrade to edge-tts for native Mandarin quality
        </p>
        <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">
          Free, one command to install. Uses Microsoft's XiaoxiaoNeural — the same voice as paid Azure.
        </p>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <button
          onClick={onOpenSetup}
          className="text-xs px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-medium transition-colors"
        >
          Setup guide
        </button>
        <button
          onClick={() => setDismissed(true)}
          className="text-amber-400 hover:text-amber-600 dark:hover:text-amber-300 text-lg leading-none"
          aria-label="Dismiss"
        >
          ×
        </button>
      </div>
    </div>
  );
}
