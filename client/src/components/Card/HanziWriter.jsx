import { useEffect, useRef, useState } from 'react';

const COLORS = {
  light: { stroke: '#1a1a2e', outline: '#d1d5db', radical: '#ef4444' },
  dark:  { stroke: '#e2e8f0', outline: '#374151', radical: '#f87171' },
};

function WriterInstance({ char, dark, containerSize, onReady, autoPlay }) {
  const ref = useRef(null);
  const writerRef = useRef(null);

  useEffect(() => {
    if (!ref.current || !window.HanziWriter) return;
    if (writerRef.current) { writerRef.current = null; ref.current.innerHTML = ''; }

    const c = dark ? COLORS.dark : COLORS.light;
    try {
      const w = window.HanziWriter.create(ref.current, char, {
        width: containerSize,
        height: containerSize,
        padding: 10,
        strokeColor: c.stroke,
        outlineColor: c.outline,
        radicalColor: c.radical,
        strokeAnimationSpeed: 1,
        delayBetweenStrokes: 80,
        showOutline: true,
        showCharacter: false,
      });
      writerRef.current = w;
      if (onReady) onReady(w);
      if (autoPlay) {
        setTimeout(() => w.animateCharacter(), 300);
      }
    } catch {
      // HanziWriter may not have data for some chars — silently skip
    }

    return () => { ref.current && (ref.current.innerHTML = ''); };
  }, [char, dark, containerSize, autoPlay]);

  return <div ref={ref} style={{ width: containerSize, height: containerSize }} />;
}

export default function HanziWriterCard({ hanzi, dark, autoPlay = true, size = 160 }) {
  const [writers, setWriters] = useState([]);
  const chars = [...hanzi]; // split multi-char words into individual chars

  const handleReady = (w, idx) => {
    setWriters(prev => {
      const next = [...prev];
      next[idx] = w;
      return next;
    });
  };

  const replayAll = () => {
    chars.forEach((_, idx) => {
      if (writers[idx]) {
        setTimeout(() => writers[idx].animateCharacter(), idx * 800);
      }
    });
  };

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="flex gap-2 flex-wrap justify-center">
        {chars.map((char, idx) => (
          <div
            key={idx}
            className="rounded-xl overflow-hidden bg-gray-50 dark:bg-gray-800/50 shadow-inner"
          >
            <WriterInstance
              char={char}
              dark={dark}
              containerSize={size}
              autoPlay={autoPlay}
              onReady={(w) => handleReady(w, idx)}
            />
          </div>
        ))}
      </div>

      <button
        onClick={replayAll}
        className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg
                   bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300
                   hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
        Replay stroke order
      </button>
    </div>
  );
}

// Handwriting quiz mode
export function HanziQuiz({ char, dark, size = 200, onComplete }) {
  const ref = useRef(null);
  const writerRef = useRef(null);
  const [score, setScore] = useState(null);

  useEffect(() => {
    if (!ref.current || !window.HanziWriter) return;
    ref.current.innerHTML = '';

    const c = dark ? COLORS.dark : COLORS.light;
    try {
      const w = window.HanziWriter.create(ref.current, char, {
        width: size,
        height: size,
        padding: 10,
        strokeColor: c.stroke,
        outlineColor: c.outline,
        showOutline: true,
        showCharacter: false,
      });
      writerRef.current = w;

      w.quiz({
        onMistake: () => {},
        onCorrectStroke: () => {},
        onComplete: (summary) => {
          const pct = Math.round(((summary.totalStrokes - summary.mistakesOnStroke?.length || 0) / summary.totalStrokes) * 100);
          setScore(pct);
          if (onComplete) onComplete(summary);
        },
      });
    } catch { /* no data for char */ }

    return () => { ref.current && (ref.current.innerHTML = ''); };
  }, [char, dark, size]);

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="rounded-xl overflow-hidden bg-gray-50 dark:bg-gray-800/50 shadow-inner">
        <div ref={ref} style={{ width: size, height: size }} />
      </div>
      {score !== null && (
        <div className={`text-sm font-semibold px-3 py-1 rounded-full ${
          score >= 70 ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                      : 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300'
        }`}>
          {score >= 70 ? `✓ ${score}% accuracy` : `Try again — ${score}%`}
        </div>
      )}
    </div>
  );
}
