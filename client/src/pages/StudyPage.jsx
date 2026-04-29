import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../lib/api';
import { useStore } from '../store/useStore';
import StudyCard from '../components/Card/StudyCard';
import SessionSummary from '../components/Session/SessionSummary';
import WebSpeechBanner from '../components/WebSpeechBanner';
import TtsSetupWizard from '../components/TtsSetupWizard';

export default function StudyPage() {
  const navigate = useNavigate();
  const { selectedLevels, batchSize } = useStore();
  const [cards, setCards] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [done, setDone] = useState(false);
  const [newCardIds, setNewCardIds] = useState(new Set());
  const [showWizard, setShowWizard] = useState(false);
  const startTimeRef = useRef(Date.now());

  useEffect(() => {
    if (selectedLevels.length === 0) {
      navigate('/');
      return;
    }
    loadSession();
  }, []);

  async function loadSession() {
    setLoading(true);
    try {
      const levels = selectedLevels.join(',');
      const half = Math.ceil(batchSize / 2);

      // Mix due reviews and new cards
      const [due, newCards] = await Promise.all([
        api.getDueCards({ levels, limit: half }),
        api.getNewCards({ levels, limit: batchSize - half }),
      ]);

      const newIds = new Set(newCards.map(c => c.id));
      setNewCardIds(newIds);

      // Interleave: due cards first, then new
      const mixed = [...due, ...newCards];
      if (mixed.length === 0) {
        setError('No cards to study right now! Come back later or add more levels.');
        setLoading(false);
        return;
      }

      setCards(mixed);
      startTimeRef.current = Date.now();
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  const handleRate = useCallback(async (rating) => {
    const card = cards[currentIndex];
    if (!card) return;

    try {
      await api.submitReview(card.id, rating);
    } catch (e) {
      console.error('Review error:', e);
    }

    const newResults = [...results, { card, rating }];
    setResults(newResults);

    const nextIndex = currentIndex + 1;
    if (nextIndex >= cards.length) {
      // Session complete — log it
      const duration = Math.round((Date.now() - startTimeRef.current) / 1000);
      const correct = newResults.filter(r => r.rating >= 2).length;
      const newIntroduced = newResults.filter(r => newCardIds.has(r.card.id)).length;
      api.logSession({
        cards_reviewed: newResults.length,
        cards_correct: correct,
        new_cards_introduced: newIntroduced,
        duration_seconds: duration,
      }).catch(console.error);
      setDone(true);
    } else {
      setCurrentIndex(nextIndex);
    }
  }, [cards, currentIndex, results, newCardIds]);

  if (loading) return <LoadingScreen />;
  if (error) return <ErrorScreen message={error} onBack={() => navigate('/')} />;
  if (done) return (
    <SessionSummary
      results={results}
      duration={Math.round((Date.now() - startTimeRef.current) / 1000)}
      onDone={() => navigate('/')}
      onStudyMore={() => { setDone(false); loadSession(); }}
    />
  );

  const card = cards[currentIndex];
  const progress = ((currentIndex) / cards.length) * 100;

  return (
    <div className="space-y-4 animate-fade-in">
      {/* WebSpeech upgrade banner */}
      <WebSpeechBanner onOpenSetup={() => setShowWizard(true)} />

      {/* Progress bar */}
      <div className="space-y-1">
        <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
          <span>{currentIndex} / {cards.length} cards</span>
          <span>{cards.length - currentIndex} remaining</span>
        </div>
        <div className="h-1.5 bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-brand-600 rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
      </div>

      {/* Card */}
      <AnimatePresence mode="wait">
        <motion.div
          key={card.id}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.2 }}
        >
          <StudyCard
            card={card}
            onRate={handleRate}
            isNew={newCardIds.has(card.id)}
          />
        </motion.div>
      </AnimatePresence>

      {/* TTS setup wizard (re-openable from banner) */}
      <AnimatePresence>
        {showWizard && <TtsSetupWizard onClose={() => setShowWizard(false)} />}
      </AnimatePresence>
    </div>
  );
}

function LoadingScreen() {
  return (
    <div className="flex flex-col items-center justify-center h-64 gap-4">
      <div className="font-chinese text-5xl text-gray-300 dark:text-gray-700 animate-pulse-soft">学</div>
      <p className="text-gray-500 dark:text-gray-400">Loading your cards...</p>
    </div>
  );
}

function ErrorScreen({ message, onBack }) {
  return (
    <div className="surface p-8 text-center space-y-4">
      <div className="text-4xl">🎉</div>
      <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200">All caught up!</h2>
      <p className="text-gray-600 dark:text-gray-400">{message}</p>
      <button onClick={onBack} className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl font-medium transition-colors">
        Back to home
      </button>
    </div>
  );
}
