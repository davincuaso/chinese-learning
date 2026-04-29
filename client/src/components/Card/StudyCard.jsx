import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '../../store/useStore';
import { useTTS } from '../../hooks/useTTS';
import { usePixabay } from '../../hooks/usePixabay';
import HanziWriterCard, { HanziQuiz } from './HanziWriter';
import ToneDiagram from './ToneDiagram';
import HskBadge from './HskBadge';

const RATING_LABELS = ['Again', 'Hard', 'Good', 'Easy'];
const RATING_INTERVALS = ['<1d', '1d', '~6d', '~10d'];
const RATING_CLASSES = ['btn-again', 'btn-hard', 'btn-good', 'btn-easy'];

export default function StudyCard({ card, onRate, isNew }) {
  const [flipped, setFlipped] = useState(false);
  const [showQuiz, setShowQuiz] = useState(false);
  const darkMode = useStore(s => s.darkMode);
  const slowMode = useStore(s => s.slowMode);
  const setSlowMode = useStore(s => s.setSlowMode);
  const { play, playSequence, stop, speaking, loading } = useTTS();

  const englishWord = Array.isArray(card.meanings)
    ? card.meanings[0]?.split(/[/;,]/)[0].trim()
    : card.meanings;
  const { imageUrl } = usePixabay(englishWord);

  const firstExample = Array.isArray(card.examples) && card.examples.length > 0
    ? card.examples[0].chinese
    : null;

  // Reset card state when card changes
  useEffect(() => {
    setFlipped(false);
    setShowQuiz(false);
    stop();
  }, [card.id]);

  const handleFlip = useCallback(() => {
    if (!flipped) {
      setFlipped(true);
      // Auto-play: word immediately, then sentence after 1.5s
      setTimeout(() => {
        if (firstExample) {
          playSequence(card.hanzi, firstExample, 1500);
        } else {
          play(card.hanzi);
        }
      }, 400);
    }
  }, [flipped, card.hanzi, firstExample, play, playSequence]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e) => {
      if (!flipped && e.code === 'Space') { e.preventDefault(); handleFlip(); return; }
      if (flipped) {
        if (e.key === '1') onRate(0);
        if (e.key === '2') onRate(1);
        if (e.key === '3') onRate(2);
        if (e.key === '4') onRate(3);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [flipped, handleFlip, onRate]);

  return (
    <div className="w-full max-w-lg mx-auto">
      <div className="relative" style={{ minHeight: flipped ? 'auto' : '360px' }}>
        <AnimatePresence mode="wait">
          {!flipped ? (
            <motion.div
              key="front"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              className="surface p-8 flex flex-col items-center gap-6 cursor-pointer select-none"
              onClick={handleFlip}
            >
              <div className="flex items-center justify-between w-full">
                <HskBadge level={card.hsk_level} />
                {isNew && <span className="text-xs bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-full font-medium">New</span>}
              </div>
              <div className="hanzi-large text-gray-900 dark:text-gray-100">{card.hanzi}</div>
              <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
                Tap or press <kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 rounded text-xs">Space</kbd> to reveal
              </p>
            </motion.div>
          ) : (
            <motion.div
              key="back"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              className="surface p-6 flex flex-col gap-5"
            >
              {/* Header row */}
              <div className="flex items-center justify-between">
                <HskBadge level={card.hsk_level} />
                <div className="flex items-center gap-1.5">
                  {/* Slow mode toggle — session-level */}
                  <button
                    onClick={() => setSlowMode(!slowMode)}
                    title={slowMode ? 'Switch to normal speed' : 'Switch to slow speed'}
                    className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium transition-colors ${
                      slowMode
                        ? 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300'
                        : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800'
                    }`}
                  >
                    🐢 {slowMode ? 'Slow' : 'Normal'}
                  </button>
                  {/* Replay: word only */}
                  <AudioButton
                    onClick={() => play(card.hanzi)}
                    loading={loading}
                    speaking={speaking}
                    title="Play word"
                  >
                    <WordIcon />
                  </AudioButton>
                  {/* Replay: sentence only */}
                  {firstExample && (
                    <AudioButton
                      onClick={() => play(firstExample)}
                      loading={loading}
                      speaking={speaking}
                      title="Play sentence"
                    >
                      <SentenceIcon />
                    </AudioButton>
                  )}
                  {/* Replay: word + sentence */}
                  {firstExample && (
                    <AudioButton
                      onClick={() => playSequence(card.hanzi, firstExample)}
                      loading={loading}
                      speaking={speaking}
                      title="Play word then sentence"
                    >
                      <BothIcon />
                    </AudioButton>
                  )}
                  {/* Stop */}
                  {(speaking || loading) && (
                    <button
                      onClick={stop}
                      className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                      title="Stop"
                    >
                      <StopIcon />
                    </button>
                  )}
                  {/* Writing quiz toggle */}
                  <button
                    onClick={() => setShowQuiz(q => !q)}
                    title="Practice writing"
                    className={`p-1.5 rounded-lg transition-colors text-xs ${showQuiz ? 'bg-brand-100 dark:bg-brand-900/40 text-brand-600 dark:text-brand-300' : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800'}`}
                  >
                    ✏️
                  </button>
                </div>
              </div>

              {/* Hanzi */}
              <div className="text-center">
                <div className="hanzi-large text-gray-900 dark:text-gray-100">{card.hanzi}</div>
              </div>

              {/* Stroke animation or quiz */}
              {showQuiz ? (
                <div className="flex justify-center">
                  <HanziQuiz char={card.hanzi[0]} dark={darkMode} size={180} />
                </div>
              ) : (
                <div className="hanzi-writer-container flex justify-center">
                  <HanziWriterCard hanzi={card.hanzi} dark={darkMode} autoPlay size={140} />
                </div>
              )}

              {/* Tone diagram */}
              <ToneDiagram pinyin={card.pinyin} />

              {/* Meanings */}
              <div className="space-y-1">
                {(Array.isArray(card.meanings) ? card.meanings : [card.meanings]).slice(0, 4).map((m, i) => (
                  <p key={i} className={i === 0 ? 'text-base font-semibold text-gray-900 dark:text-gray-100' : 'text-sm text-gray-600 dark:text-gray-400'}>
                    {i === 0 ? m : `• ${m}`}
                  </p>
                ))}
              </div>

              {/* Character components */}
              {Array.isArray(card.components) && card.components.length > 1 && (
                <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-3">
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-2 font-medium">Character components</p>
                  <div className="flex flex-wrap gap-3">
                    {card.components.map((comp, i) => (
                      <div key={i} className="flex items-center gap-1.5">
                        <span className="font-chinese text-xl font-bold text-gray-800 dark:text-gray-200">{comp.hanzi}</span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">{comp.meaning}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Example sentences */}
              {Array.isArray(card.examples) && card.examples.length > 0 && (
                <div className="space-y-3">
                  <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Example sentences</p>
                  {card.examples.map((ex, i) => (
                    <div key={i} className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-3 space-y-1.5">
                      <div className="flex items-start gap-2">
                        <button
                          onClick={() => play(ex.chinese)}
                          title="Play sentence"
                          className="mt-0.5 text-blue-400 hover:text-blue-600 dark:text-blue-400 flex-shrink-0"
                        >
                          <SpeakerSmIcon loading={loading} speaking={speaking} />
                        </button>
                        <p className="font-chinese text-base font-medium text-gray-900 dark:text-gray-100">{ex.chinese}</p>
                      </div>
                      {/* Inline tone diagram for sentence pinyin */}
                      <div className="pl-6">
                        <ToneDiagram pinyin={ex.pinyin} compact />
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 pl-6">{ex.english}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Pixabay image */}
              {imageUrl && (
                <div className="rounded-xl overflow-hidden">
                  <img src={imageUrl} alt={englishWord} className="w-full h-36 object-cover" loading="lazy" />
                  <p className="text-xs text-gray-400 text-center py-1">Image via Pixabay</p>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Rating buttons */}
      <AnimatePresence>
        {flipped && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, delay: 0.1 }}
            className="mt-4 space-y-2"
          >
            <p className="text-xs text-center text-gray-500 dark:text-gray-400">
              How well did you recall it? <span className="opacity-60">(1–4)</span>
            </p>
            <div className="flex gap-2">
              {RATING_LABELS.map((label, i) => (
                <button key={i} onClick={() => onRate(i)} className={RATING_CLASSES[i]}>
                  <span className="block">{label}</span>
                  <span className="block text-xs opacity-60 font-normal">{RATING_INTERVALS[i]}</span>
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function AudioButton({ onClick, loading, speaking, title, children }) {
  return (
    <button
      onClick={onClick}
      title={title}
      className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors relative"
    >
      {loading ? (
        <div className="w-4 h-4 border-2 border-gray-300 border-t-brand-500 rounded-full animate-spin" />
      ) : (
        <span className={speaking ? 'text-brand-600 dark:text-brand-400' : ''}>{children}</span>
      )}
    </button>
  );
}

function WordIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.536 8.464a5 5 0 010 7.072M12 6l-4 4H5a1 1 0 00-1 1v2a1 1 0 001 1h3l4 4V6z" />
    </svg>
  );
}
function SentenceIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
    </svg>
  );
}
function BothIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}
function StopIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0zM9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
    </svg>
  );
}
function SpeakerSmIcon({ loading, speaking }) {
  if (loading) return <div className="w-3.5 h-3.5 border-2 border-blue-300 border-t-blue-500 rounded-full animate-spin" />;
  return (
    <svg className={`w-3.5 h-3.5 ${speaking ? 'text-blue-600 dark:text-blue-300' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.536 8.464a5 5 0 010 7.072M12 6l-4 4H5a1 1 0 00-1 1v2a1 1 0 001 1h3l4 4V6z" />
    </svg>
  );
}
