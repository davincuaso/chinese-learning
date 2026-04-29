import { useState, useEffect } from 'react';
import { useStore } from '../store/useStore';

const cache = new Map();

export function usePixabay(query) {
  const [imageUrl, setImageUrl] = useState(null);
  const [loading, setLoading] = useState(false);
  const pixabayKey = useStore(s => s.pixabayKey);

  useEffect(() => {
    if (!query || !pixabayKey) return;

    const key = `${pixabayKey}:${query}`;
    if (cache.has(key)) {
      setImageUrl(cache.get(key));
      return;
    }

    setLoading(true);
    const params = new URLSearchParams({
      key: pixabayKey,
      q: query,
      image_type: 'photo',
      per_page: 3,
      safesearch: 'true',
    });

    fetch(`https://pixabay.com/api/?${params}`)
      .then(r => r.json())
      .then(data => {
        const url = data.hits?.[0]?.webformatURL || null;
        cache.set(key, url);
        setImageUrl(url);
      })
      .catch(() => setImageUrl(null))
      .finally(() => setLoading(false));
  }, [query, pixabayKey]);

  return { imageUrl, loading };
}
