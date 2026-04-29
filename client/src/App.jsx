import { Routes, Route } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { useStore } from './store/useStore';
import { api } from './lib/api';
import Layout from './components/Layout';
import TtsSetupWizard from './components/TtsSetupWizard';
import HomePage from './pages/HomePage';
import StudyPage from './pages/StudyPage';
import StatsPage from './pages/StatsPage';
import SettingsPage from './pages/SettingsPage';
import BrowsePage from './pages/BrowsePage';

export default function App() {
  const darkMode = useStore(s => s.darkMode);
  const ttsSetupDone = useStore(s => s.ttsSetupDone);
  const setTtsSetupDone = useStore(s => s.setTtsSetupDone);
  const setDetectedEngine = useStore(s => s.setDetectedEngine);
  const [showWizard, setShowWizard] = useState(false);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
  }, [darkMode]);

  // Detect TTS engine on mount; show wizard if setup not done and engine is webspeech
  useEffect(() => {
    api.getTtsEngine()
      .then(({ engine }) => {
        setDetectedEngine(engine);
        if (!ttsSetupDone && engine === 'webspeech') {
          setShowWizard(true);
        }
        // If a real engine is detected, mark setup as done automatically
        if (engine !== 'webspeech') {
          setTtsSetupDone(true);
        }
      })
      .catch(() => {
        setDetectedEngine('webspeech');
        if (!ttsSetupDone) setShowWizard(true);
      });
  }, []);

  return (
    <>
      <Layout>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/study" element={<StudyPage />} />
          <Route path="/stats" element={<StatsPage />} />
          <Route path="/browse" element={<BrowsePage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Routes>
      </Layout>

      <AnimatePresence>
        {showWizard && (
          <TtsSetupWizard onClose={() => setShowWizard(false)} />
        )}
      </AnimatePresence>
    </>
  );
}
