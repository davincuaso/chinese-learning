import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useStore = create(
  persist(
    (set, get) => ({
      // Theme
      darkMode: false,
      toggleDarkMode: () => {
        const next = !get().darkMode;
        set({ darkMode: next });
        document.documentElement.classList.toggle('dark', next);
      },

      // Study settings
      batchSize: 20,
      setBatchSize: (n) => set({ batchSize: n }),
      selectedLevels: [1, 2, 3, 4, 5, 6],
      setSelectedLevels: (levels) => set({ selectedLevels: levels }),

      // Pixabay API key
      pixabayKey: '',
      setPixabayKey: (key) => set({ pixabayKey: key }),

      // TTS / audio settings
      ttsVoice: 'zh-CN-XiaoxiaoNeural',  // edge-tts default
      setTtsVoice: (v) => set({ ttsVoice: v }),
      slowMode: false,                    // session-level slow toggle
      setSlowMode: (v) => set({ slowMode: v }),
      // Web Speech fallback settings (Level 3)
      webSpeechVoice: null,
      setWebSpeechVoice: (name) => set({ webSpeechVoice: name }),

      // Azure credentials (Level 2 - stored client-side to POST to backend)
      azureKey: '',
      azureRegion: 'eastus',
      setAzureKey: (k) => set({ azureKey: k }),
      setAzureRegion: (r) => set({ azureRegion: r }),

      // Setup wizard state
      ttsSetupDone: false,
      setTtsSetupDone: (v) => set({ ttsSetupDone: v }),

      // Detected engine (cached from /api/tts/engine, refreshed on mount)
      detectedEngine: null,
      setDetectedEngine: (e) => set({ detectedEngine: e }),

      // Session state (not persisted)
      currentSession: null,
      startSession: (cards, isNew) => set({
        currentSession: { cards, currentIndex: 0, isNew, results: [], startedAt: Date.now() },
      }),
      endSession: () => set({ currentSession: null }),
      advanceSession: (rating) => {
        const { currentSession } = get();
        if (!currentSession) return;
        set({
          currentSession: {
            ...currentSession,
            currentIndex: currentSession.currentIndex + 1,
            results: [...currentSession.results, rating],
          },
        });
      },
    }),
    {
      name: 'chinese-learning-prefs',
      version: 2,
      migrate: (persistedState, version) => {
        const next = persistedState || {};
        // One-time migration: move prior male defaults to female default.
        if (version < 2 && (next.ttsVoice === 'zh-CN-YunxiNeural' || next.ttsVoice === 'zh-CN-YunjianNeural')) {
          next.ttsVoice = 'zh-CN-XiaoxiaoNeural';
        }
        return next;
      },
      partialize: (state) => ({
        darkMode: state.darkMode,
        batchSize: state.batchSize,
        selectedLevels: state.selectedLevels,
        pixabayKey: state.pixabayKey,
        ttsVoice: state.ttsVoice,
        slowMode: state.slowMode,
        webSpeechVoice: state.webSpeechVoice,
        azureKey: state.azureKey,
        azureRegion: state.azureRegion,
        ttsSetupDone: state.ttsSetupDone,
      }),
    }
  )
);

// Apply saved dark mode on load
const saved = JSON.parse(localStorage.getItem('chinese-learning-prefs') || '{}');
if (saved?.state?.darkMode) {
  document.documentElement.classList.add('dark');
}
