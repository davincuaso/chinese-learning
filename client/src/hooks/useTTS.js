import { useState, useEffect, useCallback, useRef } from 'react';
import { useStore } from '../store/useStore';
import { api } from '../lib/api';

// Blob URL cache (in-memory, lives for the tab session)
const audioCache = new Map();

export function useTTS() {
  const ttsVoice = useStore(s => s.ttsVoice);
  const slowMode = useStore(s => s.slowMode);
  const webSpeechVoice = useStore(s => s.webSpeechVoice);
  const detectedEngine = useStore(s => s.detectedEngine);

  const [speaking, setSpeaking] = useState(false);
  const [loading, setLoading] = useState(false);
  const audioRef = useRef(null);
  const sequenceRef = useRef(null); // for cancellable word→sentence auto-play

  const stop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = '';
    }
    if (sequenceRef.current) {
      clearTimeout(sequenceRef.current);
      sequenceRef.current = null;
    }
    window.speechSynthesis?.cancel();
    setSpeaking(false);
    setLoading(false);
  }, []);

  // Core play function — returns a Promise that resolves when audio ends
  const play = useCallback(async (text, speedOverride) => {
    if (!text) return;
    stop();

    const speed = speedOverride ?? (slowMode ? 'slow' : 'normal');
    const engine = detectedEngine;

    // Level 3: Web Speech API
    if (engine === 'webspeech' || engine === null) {
      return playWebSpeech(text, webSpeechVoice, speed);
    }

    // Level 1/2: backend TTS
    const cacheKey = `${text}|${ttsVoice}|${speed}`;
    setLoading(true);

    try {
      let url = audioCache.get(cacheKey);
      if (!url) {
        const result = await api.synthesizeTts(text, ttsVoice, speed);
        if (result.engine === 'webspeech') {
          setLoading(false);
          return playWebSpeech(text, webSpeechVoice, speed);
        }
        url = result.url;
        audioCache.set(cacheKey, url);
      }

      setLoading(false);
      setSpeaking(true);

      return new Promise((resolve) => {
        const audio = new Audio(url);
        audioRef.current = audio;
        audio.onended = () => { setSpeaking(false); resolve(); };
        audio.onerror = () => { setSpeaking(false); resolve(); };
        audio.onpause = () => setSpeaking(false);
        audio.play().catch(() => { setSpeaking(false); resolve(); });
      });
    } catch (err) {
      console.warn('[useTTS] Backend failed, falling back to Web Speech:', err.message);
      setLoading(false);
      return playWebSpeech(text, webSpeechVoice, speed);
    }
  }, [ttsVoice, slowMode, webSpeechVoice, detectedEngine, stop]);

  // Play word, then sentence after a delay
  const playSequence = useCallback(async (word, sentence, delayMs = 1500) => {
    stop();
    await play(word);
    await new Promise(resolve => {
      sequenceRef.current = setTimeout(resolve, delayMs);
    });
    if (sentence) await play(sentence);
  }, [play, stop]);

  return { play, playSequence, stop, speaking, loading };
}

// Web Speech helper
function playWebSpeech(text, preferredVoiceName, speed) {
  return new Promise((resolve) => {
    if (!('speechSynthesis' in window)) { resolve(); return; }
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = 'zh-CN';
    utter.rate = speed === 'slow' ? 0.6 : 1.0;
    utter.pitch = 1.0;

    const voices = window.speechSynthesis.getVoices().filter(v => v.lang.startsWith('zh'));
    if (preferredVoiceName) {
      const match = voices.find(v => v.name === preferredVoiceName);
      if (match) utter.voice = match;
    } else if (voices.length > 0) {
      const preferredFemale = voices.find(v =>
        /xiaoxiao|xiaoyi|female|woman|女|tingting|huihui|meijia/i.test(v.name)
      );
      utter.voice = preferredFemale || voices[0];
    }

    utter.onend = resolve;
    utter.onerror = resolve;
    window.speechSynthesis.speak(utter);
  });
}
