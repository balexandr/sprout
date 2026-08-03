import { useState, useCallback } from 'react';

const STATS_KEY = 'sprout-stats';

function getDefaultStats() {
  return {
    gamesPlayed: 0,
    gamesWon: 0,
    currentStreak: 0,
    maxStreak: 0,
    bestTime: null,
    totalTime: 0,
    lastCompletedDate: null,
  };
}

function loadStats() {
  try {
    const raw = localStorage.getItem(STATS_KEY);
    if (!raw) return getDefaultStats();
    return { ...getDefaultStats(), ...JSON.parse(raw) };
  } catch { return getDefaultStats(); }
}

function saveStats(stats) {
  try { localStorage.setItem(STATS_KEY, JSON.stringify(stats)); } catch {}
}

function isConsecutiveDay(dateA, dateB) {
  if (!dateA || !dateB) return false;
  const diff = Math.abs(new Date(dateB) - new Date(dateA));
  return diff >= 86400000 && diff < 172800000;
}

export function useStats() {
  const [stats, setStats] = useState(loadStats);

  const recordGame = useCallback((dateKey, elapsedSeconds) => {
    setStats((prev) => {
      if (prev.lastCompletedDate === dateKey) return prev;
      const next = { ...prev };
      next.gamesPlayed += 1;
      next.gamesWon += 1;
      next.totalTime += elapsedSeconds;
      next.lastCompletedDate = dateKey;
      if (next.bestTime === null || elapsedSeconds < next.bestTime) {
        next.bestTime = elapsedSeconds;
      }
      if (isConsecutiveDay(prev.lastCompletedDate, dateKey) || prev.gamesPlayed === 0) {
        next.currentStreak = prev.currentStreak + 1;
      } else {
        next.currentStreak = 1;
      }
      next.maxStreak = Math.max(next.maxStreak, next.currentStreak);
      saveStats(next);
      return next;
    });
  }, []);

  const winPct = stats.gamesPlayed > 0
    ? Math.round((stats.gamesWon / stats.gamesPlayed) * 100)
    : 0;

  return { stats, winPct, recordGame };
}
