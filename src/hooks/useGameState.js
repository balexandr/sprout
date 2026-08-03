import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import puzzles from '../data/puzzles.json';

const STORAGE_KEY = 'sprout-game-state';
// NOTE: this EPOCH must stay in sync with scripts/generate-puzzles.mjs —
// that script computes each puzzle's difficulty from the same constant.
const EPOCH = '2026-08-03';

function getTodayKey() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York' }).format(new Date());
}

function cellKey(r, c) { return `${r},${c}`; }

function cellsFor(word) {
  const out = [];
  for (let k = 0; k < word.length; k++) {
    const [r, c] = word.direction === 'across' ? [word.row, word.col + k] : [word.row + k, word.col];
    out.push([r, c, k]);
  }
  return out;
}

function loadState(dateKey) {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const saved = JSON.parse(raw);
    if (saved.dateKey !== dateKey) return null;
    return saved;
  } catch { return null; }
}

function saveState(state) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch {}
}

export function useGameState() {
  const dateKey = getTodayKey();
  const puzzle = puzzles[dateKey] || null;
  const puzzleNumber = Math.floor((new Date(dateKey) - new Date(EPOCH)) / 86400000) + 1;

  const [entries, setEntriesState] = useState({});
  const [gameStatus, setGameStatus] = useState('playing');
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [timerRunning, setTimerRunning] = useState(false);
  const [initialized, setInitialized] = useState(false);

  const timerRef = useRef(null);
  const elapsedRef = useRef(0);
  const prevVisibleRef = useRef(new Set());

  // Timer tick
  useEffect(() => {
    if (timerRunning) {
      timerRef.current = setInterval(() => {
        elapsedRef.current += 1;
        setElapsedSeconds(elapsedRef.current);
      }, 1000);
    } else {
      clearInterval(timerRef.current);
    }
    return () => clearInterval(timerRef.current);
  }, [timerRunning]);

  // Init
  useEffect(() => {
    if (!puzzle) { setInitialized(true); return; }

    const saved = loadState(dateKey);
    if (saved && saved.entries) {
      setEntriesState(saved.entries);
      setGameStatus(saved.gameStatus || 'playing');
      elapsedRef.current = saved.elapsedSeconds || 0;
      setElapsedSeconds(elapsedRef.current);
      if ((saved.gameStatus || 'playing') === 'playing') setTimerRunning(true);
    } else {
      setTimerRunning(true);
    }
    setInitialized(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateKey]);

  // Persist
  useEffect(() => {
    if (!initialized || !puzzle) return;
    saveState({ dateKey, entries, gameStatus, elapsedSeconds });
  }, [entries, gameStatus, elapsedSeconds, initialized, dateKey, puzzle]);

  // Adjacency graph: two cross-direction words that share exactly one cell
  // are neighbors at that cell.
  const adjacency = useMemo(() => {
    const map = {};
    if (!puzzle) return map;
    for (const w of puzzle.words) map[w.id] = [];
    for (let i = 0; i < puzzle.words.length; i++) {
      const a = puzzle.words[i];
      const aCells = new Set(cellsFor(a).map(([r, c]) => cellKey(r, c)));
      for (let j = i + 1; j < puzzle.words.length; j++) {
        const b = puzzle.words[j];
        if (a.direction === b.direction) continue;
        const shared = cellsFor(b).filter(([r, c, _k]) => aCells.has(cellKey(r, c)));
        if (shared.length === 1) {
          map[a.id].push(b.id);
          map[b.id].push(a.id);
        }
      }
    }
    return map;
  }, [puzzle]);

  const solvedIds = useMemo(() => {
    const set = new Set();
    if (!puzzle) return set;
    for (const w of puzzle.words) {
      let solved = true;
      for (const [r, c, k] of cellsFor(w)) {
        if (entries[cellKey(r, c)] !== w.answer[k]) { solved = false; break; }
      }
      if (solved) set.add(w.id);
    }
    return set;
  }, [puzzle, entries]);

  // Visible set: BFS from the seed, gated by solved state. Seed + its first
  // crossing partner are always shown, regardless of solved state.
  const visibleIds = useMemo(() => {
    const set = new Set();
    if (!puzzle) return set;
    const seed = puzzle.seedWordId;
    set.add(seed);
    const firstPartner = adjacency[seed]?.[0];
    if (firstPartner) set.add(firstPartner);

    const queue = [...set];
    while (queue.length) {
      const w = queue.pop();
      if (solvedIds.has(w)) {
        for (const n of adjacency[w] || []) {
          if (!set.has(n)) { set.add(n); queue.push(n); }
        }
      }
    }
    return set;
  }, [puzzle, adjacency, solvedIds]);

  const justRevealed = useMemo(() => {
    const prev = prevVisibleRef.current;
    const fresh = new Set();
    for (const id of visibleIds) if (!prev.has(id)) fresh.add(id);
    return fresh;
  }, [visibleIds]);

  useEffect(() => {
    prevVisibleRef.current = visibleIds;
  }, [visibleIds]);

  const won = useMemo(() => {
    if (!puzzle) return false;
    return puzzle.words.every((w) => solvedIds.has(w.id));
  }, [puzzle, solvedIds]);

  useEffect(() => {
    if (won && gameStatus === 'playing') {
      setGameStatus('won');
      setTimerRunning(false);
    }
  }, [won, gameStatus]);

  const setCellLetter = useCallback((r, c, letter) => {
    if (gameStatus !== 'playing') return;
    setEntriesState((prev) => {
      const key = cellKey(r, c);
      if (letter === null) {
        if (!(key in prev)) return prev;
        const next = { ...prev };
        delete next[key];
        return next;
      }
      if (prev[key] === letter) return prev;
      return { ...prev, [key]: letter };
    });
  }, [gameStatus]);

  const generateShareText = useCallback(() => {
    if (!puzzle) return '';
    const mm = String(Math.floor(elapsedSeconds / 60)).padStart(2, '0');
    const ss = String(elapsedSeconds % 60).padStart(2, '0');
    return `Sprout #${puzzleNumber} 🌱\n⏱ ${mm}:${ss}  •  ${puzzle.words.length} words grown`;
  }, [puzzle, elapsedSeconds, puzzleNumber]);

  return {
    puzzle,
    dateKey,
    puzzleNumber,
    initialized,
    entries,
    setCellLetter,
    adjacency,
    solvedIds,
    visibleIds,
    justRevealed,
    gameStatus,
    elapsedSeconds,
    timerRunning,
    generateShareText,
  };
}
