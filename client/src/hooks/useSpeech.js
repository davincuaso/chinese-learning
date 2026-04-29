import { useState, useEffect, useCallback, useRef } from 'react';
import { useStore } from '../store/useStore';

export function useSpeech() {
  const [voices, setVoices] = useState([]);
  const [supported, setSupported] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const preferredVoice = useStore(s => s.preferredVoice);
  const speechRate = useStore(s => s.speechRate);
  const utteranceRef = useRef(null);

  useEffect(() => {
    if (!('speechSynthesis' in window)) return;
    setSupported(true);

    const loadVoices = () => {
      const all = window.speechSynthesis.getVoices();
      const chinese = all.filter(v => v.lang.startsWith('zh'));
      setVoices(chinese);
    };

    loadVoices();
    window.speechSynthesis.addEventListener('voiceschanged', loadVoices);
    return () => window.speechSynthesis.removeEventListener('voiceschanged', loadVoices);
  }, []);

  const speak = useCallback((text, rate = null) => {
    if (!supported) return;
    window.speechSynthesis.cancel();

    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = 'zh-CN';
    utter.rate = rate ?? speechRate;
    utter.pitch = 1.0;

    // Pick preferred voice or best available
    const all = window.speechSynthesis.getVoices();
    const chinese = all.filter(v => v.lang.startsWith('zh'));
    if (preferredVoice) {
      const match = chinese.find(v => v.name === preferredVoice);
      if (match) utter.voice = match;
    } else if (chinese.length > 0) {
      utter.voice = chinese[0];
    }

    utter.onstart = () => setSpeaking(true);
    utter.onend = () => setSpeaking(false);
    utter.onerror = () => setSpeaking(false);

    utteranceRef.current = utter;
    window.speechSynthesis.speak(utter);
  }, [supported, preferredVoice, speechRate]);

  const stop = useCallback(() => {
    window.speechSynthesis.cancel();
    setSpeaking(false);
  }, []);

  return { speak, stop, speaking, voices, supported };
}
