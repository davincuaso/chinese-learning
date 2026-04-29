import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '../store/useStore';
import { api } from '../lib/api';

const EDGE_INSTALL = {
  macOS:   'pip3 install edge-tts',
  Windows: 'pip install edge-tts',
  Linux:   'pip3 install edge-tts',
};

function detectOS() {
  const ua = navigator.userAgent;
  if (ua.includes('Win')) return 'Windows';
  if (ua.includes('Mac')) return 'macOS';
  return 'Linux';
}

export default function TtsSetupWizard({ onClose }) {
  const [tab, setTab] = useState('edge');  // 'edge' | 'azure' | 'browser'
  const [testState, setTestState] = useState('idle'); // 'idle'|'testing'|'ok'|'fail'
  const [azureKey, setAzureKey] = useState('');
  const [azureRegion, setAzureRegion] = useState('eastus');
  const [azureSaving, setAzureSaving] = useState(false);
  const [azureMsg, setAzureMsg] = useState('');
  const { setTtsSetupDone, setAzureKey: storeSetAzureKey, setAzureRegion: storeSetAzureRegion } = useStore();
  const os = detectOS();

  const handleTestEdge = async () => {
    setTestState('testing');
    try {
      const result = await api.synthesizeTts('你好，欢迎学习中文！', 'zh-CN-XiaoxiaoNeural', 'normal');
      if (result.url) {
        const audio = new Audio(result.url);
        audio.play();
        setTestState('ok');
      } else {
        setTestState('fail');
      }
    } catch {
      setTestState('fail');
    }
  };

  const handleSaveAzure = async () => {
    setAzureSaving(true);
    setAzureMsg('');
    try {
      // Test by asking the backend to synthesize with the supplied key
      // We temporarily set env vars via a special endpoint
      const res = await fetch('/api/tts/azure-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: azureKey, region: azureRegion }),
      });
      if (res.ok) {
        storeSetAzureKey(azureKey);
        storeSetAzureRegion(azureRegion);
        setAzureMsg('✓ Azure key verified and saved');
      } else {
        const e = await res.json().catch(() => ({}));
        setAzureMsg(`✗ ${e.error || 'Verification failed'}`);
      }
    } catch {
      setAzureMsg('✗ Could not reach server');
    } finally {
      setAzureSaving(false);
    }
  };

  const handleUseBrowser = () => {
    setTtsSetupDone(true);
    onClose();
  };

  const handleDone = () => {
    setTtsSetupDone(true);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-brand-600 to-red-700 px-6 py-5 text-white">
          <h2 className="text-xl font-bold">Set up pronunciation audio</h2>
          <p className="text-sm text-red-100 mt-1">Choose your audio source — you can change this later in Settings</p>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 dark:border-gray-700">
          {[
            { id: 'edge', label: '⭐ edge-tts', sub: 'Recommended' },
            { id: 'azure', label: '☁ Azure', sub: 'Free tier' },
            { id: 'browser', label: '🌐 Browser', sub: 'Basic quality' },
          ].map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex-1 py-3 text-xs font-medium transition-colors border-b-2 ${
                tab === t.id
                  ? 'border-brand-600 text-brand-600 dark:text-brand-400'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
              }`}
            >
              <div>{t.label}</div>
              <div className="opacity-60">{t.sub}</div>
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 min-h-64">
          <AnimatePresence mode="wait">
            {tab === 'edge' && (
              <motion.div key="edge" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
                <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-3">
                  <p className="text-sm font-semibold text-green-800 dark:text-green-300">100% free · No API key · Azure Neural quality</p>
                  <p className="text-xs text-green-700 dark:text-green-400 mt-1">Uses Microsoft Edge's XiaoxiaoNeural — the same voice as paid Azure Cognitive Services</p>
                </div>

                <div>
                  <p className="text-sm font-medium text-gray-800 dark:text-gray-200 mb-2">Install edge-tts ({os})</p>
                  <div className="bg-gray-900 dark:bg-gray-950 rounded-xl p-3 font-mono text-sm text-green-400 select-all">
                    {EDGE_INSTALL[os]}
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                    Requires Python 3.8+. After installing, restart this server and refresh the page.
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={handleTestEdge}
                    disabled={testState === 'testing'}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium transition-colors disabled:opacity-60"
                  >
                    {testState === 'testing' ? (
                      <><Spinner /> Testing...</>
                    ) : testState === 'ok' ? (
                      '✓ Working!'
                    ) : testState === 'fail' ? (
                      '✗ Not detected — install first'
                    ) : (
                      '▶ Test voice'
                    )}
                  </button>
                  {testState === 'ok' && (
                    <button onClick={handleDone} className="px-4 py-2 rounded-xl bg-green-600 hover:bg-green-700 text-white text-sm font-medium transition-colors">
                      Use edge-tts →
                    </button>
                  )}
                </div>
              </motion.div>
            )}

            {tab === 'azure' && (
              <motion.div key="azure" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
                <div className="bg-sky-50 dark:bg-sky-900/20 border border-sky-200 dark:border-sky-800 rounded-xl p-3">
                  <p className="text-sm font-semibold text-sky-800 dark:text-sky-300">Azure F0 free tier — 500,000 chars/month</p>
                  <p className="text-xs text-sky-700 dark:text-sky-400 mt-1">No credit card required. Requires a free Microsoft account.</p>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-medium text-gray-700 dark:text-gray-300 block mb-1">Speech key</label>
                    <input
                      type="password"
                      value={azureKey}
                      onChange={e => setAzureKey(e.target.value)}
                      placeholder="e.g. abc123def456..."
                      className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-700 dark:text-gray-300 block mb-1">Region</label>
                    <input
                      type="text"
                      value={azureRegion}
                      onChange={e => setAzureRegion(e.target.value)}
                      placeholder="e.g. eastus"
                      className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={handleSaveAzure}
                    disabled={!azureKey || azureSaving}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-sm font-medium transition-colors disabled:opacity-60"
                  >
                    {azureSaving ? <><Spinner /> Verifying...</> : 'Verify & save'}
                  </button>
                  <a
                    href="https://azure.microsoft.com/free/cognitive-services/"
                    target="_blank"
                    rel="noopener"
                    className="text-xs text-sky-600 dark:text-sky-400 underline"
                  >
                    Get free Azure key →
                  </a>
                </div>
                {azureMsg && (
                  <p className={`text-sm font-medium ${azureMsg.startsWith('✓') ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                    {azureMsg}
                  </p>
                )}
              </motion.div>
            )}

            {tab === 'browser' && (
              <motion.div key="browser" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
                <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-3">
                  <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">Browser Web Speech API — basic quality</p>
                  <p className="text-xs text-amber-700 dark:text-amber-400 mt-1">Quality depends on your OS Chinese voice. Install a language pack for best results.</p>
                </div>

                <div className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
                  <p className="font-medium">Install a Chinese language pack to improve quality:</p>
                  <ul className="space-y-1.5 text-sm">
                    <li><span className="font-medium">Windows:</span> Settings → Time &amp; Language → Language → Add Chinese (Simplified)</li>
                    <li><span className="font-medium">macOS:</span> System Settings → Accessibility → Spoken Content → System Voice → Customize → add 普通话 (Meijia)</li>
                    <li><span className="font-medium">Android:</span> Settings → General Management → Language → Text-to-speech → add Chinese</li>
                  </ul>
                </div>

                <button
                  onClick={handleUseBrowser}
                  className="w-full py-2.5 rounded-xl border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  Continue with browser voices
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer */}
        <div className="px-6 pb-5 flex justify-between items-center">
          <button onClick={handleUseBrowser} className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
            Skip for now
          </button>
          <p className="text-xs text-gray-400">You can change this in Settings → Audio</p>
        </div>
      </motion.div>
    </div>
  );
}

function Spinner() {
  return <div className="w-3 h-3 border-2 border-white/40 border-t-white rounded-full animate-spin" />;
}
