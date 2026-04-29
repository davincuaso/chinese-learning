import { useEffect, useState } from 'react';
import { useStore } from '../store/useStore';
import { api } from '../lib/api';

export default function SettingsPage() {
  const {
    batchSize, setBatchSize,
    pixabayKey, setPixabayKey,
    darkMode, toggleDarkMode,
    ttsVoice, setTtsVoice,
    slowMode, setSlowMode,
    detectedEngine,
    azureKey, setAzureKey,
    azureRegion, setAzureRegion,
    webSpeechVoice, setWebSpeechVoice,
  } = useStore();

  const [availableVoices, setAvailableVoices] = useState([]);
  const [edgeVoices, setEdgeVoices] = useState([]);
  const [pixabayInput, setPixabayInput] = useState(pixabayKey);
  const [pixabaySaved, setPixabaySaved] = useState(false);
  const [azureKeyInput, setAzureKeyInput] = useState(azureKey);
  const [azureRegionInput, setAzureRegionInput] = useState(azureRegion);
  const [azureStatus, setAzureStatus] = useState('');
  const [cacheInfo, setCacheInfo] = useState(null);
  const [testPlaying, setTestPlaying] = useState(false);

  useEffect(() => {
    // Load edge-tts voices from backend
    api.getTtsVoices().then(data => {
      if (data.voices) setEdgeVoices(data.voices);
    }).catch(() => {});

    // Load Web Speech voices
    const loadWsVoices = () => {
      const all = window.speechSynthesis?.getVoices() || [];
      setAvailableVoices(all.filter(v => v.lang.startsWith('zh')));
    };
    loadWsVoices();
    window.speechSynthesis?.addEventListener('voiceschanged', loadWsVoices);
    return () => window.speechSynthesis?.removeEventListener('voiceschanged', loadWsVoices);
  }, []);

  const loadCacheInfo = () => {
    api.getTtsCache().then(setCacheInfo).catch(() => {});
  };
  useEffect(loadCacheInfo, []);

  const savePixabay = () => {
    setPixabayKey(pixabayInput);
    setPixabaySaved(true);
    setTimeout(() => setPixabaySaved(false), 2000);
  };

  const testAudio = async () => {
    setTestPlaying(true);
    try {
      const result = await api.synthesizeTts('你好，欢迎学习中文！', ttsVoice, slowMode ? 'slow' : 'normal');
      if (result.url) {
        const audio = new Audio(result.url);
        audio.onended = () => setTestPlaying(false);
        audio.onerror = () => setTestPlaying(false);
        audio.play();
      } else {
        // Web Speech fallback
        const utter = new SpeechSynthesisUtterance('你好，欢迎学习中文！');
        utter.lang = 'zh-CN';
        utter.onend = () => setTestPlaying(false);
        window.speechSynthesis.speak(utter);
      }
    } catch {
      setTestPlaying(false);
    }
  };

  const verifyAzure = async () => {
    setAzureStatus('Verifying...');
    try {
      const res = await fetch('/api/tts/azure-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: azureKeyInput, region: azureRegionInput }),
      });
      if (res.ok) {
        setAzureKey(azureKeyInput);
        setAzureRegion(azureRegionInput);
        setAzureStatus('✓ Verified and saved');
      } else {
        const e = await res.json().catch(() => ({}));
        setAzureStatus(`✗ ${e.error || 'Verification failed'}`);
      }
    } catch {
      setAzureStatus('✗ Server error');
    }
  };

  const clearCache = async () => {
    await api.clearTtsCache();
    loadCacheInfo();
  };

  const engineLabel = {
    'edge-tts': '⭐ edge-tts (Level 1 — Azure Neural, free)',
    'azure': '☁ Azure Cognitive Services (Level 2)',
    'webspeech': '🌐 Browser Web Speech API (Level 3)',
  }[detectedEngine] || 'Detecting...';

  const isEdge = detectedEngine === 'edge-tts';
  const isAzure = detectedEngine === 'azure';
  const isWS = detectedEngine === 'webspeech' || !detectedEngine;

  return (
    <div className="space-y-6 animate-fade-in max-w-lg">
      <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Settings</h1>

      {/* Study */}
      <Section title="Study preferences">
        <SettingRow label="Cards per session" description="New cards introduced per study session">
          <SelectInput
            value={batchSize}
            onChange={e => setBatchSize(Number(e.target.value))}
          >
            {[5, 10, 15, 20, 25, 30, 50].map(n => (
              <option key={n} value={n}>{n} cards</option>
            ))}
          </SelectInput>
        </SettingRow>
        <SettingRow label="Dark mode">
          <Toggle value={darkMode} onChange={toggleDarkMode} />
        </SettingRow>
      </Section>

      {/* Audio */}
      <Section title="Audio & pronunciation">
        {/* Engine status */}
        <div className={`rounded-xl px-3 py-2 text-sm font-medium ${
          isEdge ? 'bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-300'
          : isAzure ? 'bg-sky-50 dark:bg-sky-900/20 text-sky-800 dark:text-sky-300'
          : 'bg-amber-50 dark:bg-amber-900/20 text-amber-800 dark:text-amber-300'
        }`}>
          Active engine: {engineLabel}
        </div>

        {/* Voice picker — edge-tts */}
        {isEdge && edgeVoices.length > 0 && (
          <SettingRow label="Voice" description="Neural Chinese voice">
            <SelectInput value={ttsVoice} onChange={e => setTtsVoice(e.target.value)}>
              {edgeVoices.map(v => (
                <option key={v.id} value={v.id}>{v.label}</option>
              ))}
            </SelectInput>
          </SettingRow>
        )}

        {/* Web Speech fallback voice picker */}
        {isWS && (
          <SettingRow label="Browser voice" description="Available zh-CN voices on this device">
            {availableVoices.length > 0 ? (
              <SelectInput value={webSpeechVoice || ''} onChange={e => setWebSpeechVoice(e.target.value || null)}>
                <option value="">Auto (first available)</option>
                {availableVoices.map(v => (
                  <option key={v.name} value={v.name}>{v.name} ({v.lang})</option>
                ))}
              </SelectInput>
            ) : (
              <span className="text-xs text-amber-600 dark:text-amber-400">No zh-CN voices found</span>
            )}
          </SettingRow>
        )}

        {/* Slow mode toggle */}
        <SettingRow label="Slow speech mode" description="Reduces speech rate for clearer pronunciation">
          <Toggle value={slowMode} onChange={() => setSlowMode(!slowMode)} />
        </SettingRow>

        {/* Test button */}
        <button
          onClick={testAudio}
          disabled={testPlaying}
          className="flex items-center gap-2 px-3 py-2 text-sm rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors disabled:opacity-60"
        >
          {testPlaying ? (
            <><div className="w-3.5 h-3.5 border-2 border-gray-400 border-t-brand-500 rounded-full animate-spin" /> Playing...</>
          ) : (
            <><span>▶</span> Test pronunciation</>
          )}
        </button>

        {/* Azure credentials section */}
        <details className="space-y-3">
          <summary className="text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer select-none">
            Azure Cognitive Services (Level 2 fallback)
          </summary>
          <div className="space-y-2 pt-2">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Optional. Only used if edge-tts is not installed.{' '}
              <a href="https://azure.microsoft.com/free/cognitive-services/" target="_blank" rel="noopener" className="underline text-sky-600 dark:text-sky-400">
                Get free key
              </a>
            </p>
            <input
              type="password"
              value={azureKeyInput}
              onChange={e => setAzureKeyInput(e.target.value)}
              placeholder="Azure speech key"
              className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
            />
            <div className="flex gap-2">
              <input
                type="text"
                value={azureRegionInput}
                onChange={e => setAzureRegionInput(e.target.value)}
                placeholder="Region (e.g. eastus)"
                className="flex-1 px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
              />
              <button
                onClick={verifyAzure}
                disabled={!azureKeyInput}
                className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-sm font-medium transition-colors disabled:opacity-60"
              >
                Verify
              </button>
            </div>
            {azureStatus && (
              <p className={`text-xs font-medium ${azureStatus.startsWith('✓') ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                {azureStatus}
              </p>
            )}
          </div>
        </details>

        {/* Cache management */}
        <div className="pt-1 border-t border-gray-100 dark:border-gray-800 space-y-2">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-800 dark:text-gray-200">Audio cache</p>
              <p className="text-xs text-gray-500">
                {cacheInfo ? `${cacheInfo.count} files cached` : 'Loading...'}
              </p>
            </div>
            <button
              onClick={clearCache}
              className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              Clear cache
            </button>
          </div>
        </div>

        {/* Web Speech install guide */}
        {isWS && (
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-3 space-y-2">
            <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">Install a Chinese language pack for better quality</p>
            <ul className="text-xs text-amber-700 dark:text-amber-400 space-y-1">
              <li><strong>Windows:</strong> Settings → Time &amp; Language → Language → Add Chinese (Simplified)</li>
              <li><strong>macOS:</strong> System Settings → Accessibility → Spoken Content → System Voice → Customize → add 普通话</li>
              <li><strong>Android:</strong> Settings → General Management → Language → Text-to-speech → add Chinese</li>
            </ul>
          </div>
        )}
      </Section>

      {/* Images */}
      <Section title="Contextual images (Pixabay)">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Enter a free Pixabay API key for contextual card images.{' '}
          <a href="https://pixabay.com/api/docs/" target="_blank" rel="noopener" className="text-blue-600 dark:text-blue-400 underline">
            pixabay.com/api/docs
          </a>
        </p>
        <div className="flex gap-2">
          <input
            type="password"
            value={pixabayInput}
            onChange={e => setPixabayInput(e.target.value)}
            placeholder="Paste your Pixabay API key..."
            className="flex-1 px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
          />
          <button
            onClick={savePixabay}
            className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-sm font-medium transition-colors"
          >
            {pixabaySaved ? '✓ Saved' : 'Save'}
          </button>
        </div>
        {pixabayKey && <p className="text-xs text-green-600 dark:text-green-400">✓ API key configured</p>}
      </Section>

      {/* About */}
      <Section title="About">
        <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
          <p>HSK Vocabulary — open-source Chinese learning app</p>
          <p>Audio: edge-tts (MIT) · CC-CEDICT (CC BY-SA 3.0) · HanziWriter (MIT)</p>
          <p>All progress stored locally — no account required</p>
        </div>
      </Section>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div className="surface p-5 space-y-4">
      <h2 className="font-semibold text-gray-800 dark:text-gray-200">{title}</h2>
      {children}
    </div>
  );
}

function SettingRow({ label, description, children }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{label}</p>
        {description && <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{description}</p>}
      </div>
      {children}
    </div>
  );
}

function Toggle({ value, onChange }) {
  return (
    <button
      onClick={onChange}
      className={`relative w-11 h-6 rounded-full transition-colors ${value ? 'bg-brand-600' : 'bg-gray-300 dark:bg-gray-600'}`}
    >
      <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${value ? 'translate-x-5' : ''}`} />
    </button>
  );
}

function SelectInput({ value, onChange, children }) {
  return (
    <select
      value={value}
      onChange={onChange}
      className="px-2 py-1.5 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-400"
    >
      {children}
    </select>
  );
}
