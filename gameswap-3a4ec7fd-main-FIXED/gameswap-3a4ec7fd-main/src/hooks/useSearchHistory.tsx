import { useState, useEffect, useCallback } from "react";

const MAX_HISTORY = 10;
const STORAGE_KEY = "gameswapp_search_history";

export interface SearchHistoryItem {
  id: string;
  title: string;
  image_url: string | null;
  listing_type: string;
  price: number | null;
  viewed_at: number;
}

export const useSearchHistory = () => {
  const [history, setHistory] = useState<SearchHistoryItem[]>([]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) setHistory(JSON.parse(stored));
    } catch {}
  }, []);

  const addToHistory = useCallback((game: SearchHistoryItem) => {
    setHistory((prev) => {
      const filtered = prev.filter((h) => h.id !== game.id);
      const updated = [{ ...game, viewed_at: Date.now() }, ...filtered].slice(0, MAX_HISTORY);
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(updated)); } catch {}
      return updated;
    });
  }, []);

  const clearHistory = useCallback(() => {
    setHistory([]);
    try { localStorage.removeItem(STORAGE_KEY); } catch {}
  }, []);

  return { history, addToHistory, clearHistory };
};
