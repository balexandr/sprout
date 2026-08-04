import { useRef, useEffect, useMemo, useCallback } from 'react';
import styles from './SproutGrid.module.css';

function cellKey(r, c) { return `${r},${c}`; }

function cellsFor(word) {
  const out = [];
  for (let k = 0; k < word.length; k++) {
    const [r, c] = word.direction === 'across' ? [word.row, word.col + k] : [word.row + k, word.col];
    out.push([r, c, k]);
  }
  return out;
}

export default function SproutGrid({
  puzzle,
  entries,
  visibleIds,
  justRevealed,
  solvedIds,
  activeWordId,
  activeCell,
  onSetActive,
  gameStatus,
  onTypeLetter,
  onClearCell,
}) {
  const inputRef = useRef(null);
  const won = gameStatus === 'won';

  const wordsById = useMemo(() => {
    const map = {};
    for (const w of puzzle.words) map[w.id] = w;
    return map;
  }, [puzzle]);

  // cellKey -> array of word ids that claim that cell (among ALL words —
  // visibility is filtered at render/interaction time)
  const cellOwners = useMemo(() => {
    const map = {};
    for (const w of puzzle.words) {
      for (const [r, c] of cellsFor(w)) {
        const k = cellKey(r, c);
        if (!map[k]) map[k] = [];
        map[k].push(w.id);
      }
    }
    return map;
  }, [puzzle]);

  const visibleOwners = useCallback((r, c) => {
    const owners = cellOwners[cellKey(r, c)] || [];
    return owners.filter((id) => visibleIds.has(id));
  }, [cellOwners, visibleIds]);

  const activeWord = activeWordId ? wordsById[activeWordId] : null;

  const activeCellSet = useMemo(() => {
    if (!activeWord) return new Set();
    return new Set(cellsFor(activeWord).map(([r, c]) => cellKey(r, c)));
  }, [activeWord]);

  // Keep the hidden input focused whenever there's an active cell, so
  // mobile keyboards stay up and keystrokes keep landing.
  useEffect(() => {
    if (activeCell && !won) inputRef.current?.focus({ preventScroll: true });
  }, [activeCell, won]);

  const moveTo = useCallback((r, c, preferWordId) => {
    const owners = visibleOwners(r, c);
    if (owners.length === 0) return false;
    const wordId = owners.includes(preferWordId) ? preferWordId : owners[0];
    onSetActive(wordId, { r, c });
    return true;
  }, [visibleOwners, onSetActive]);

  const handleCellClick = useCallback((r, c) => {
    if (won) return;
    const owners = visibleOwners(r, c);
    if (owners.length === 0) return;
    const key = cellKey(r, c);
    const isSameCell = activeCell && cellKey(activeCell.r, activeCell.c) === key;
    if (isSameCell && owners.length === 2) {
      const other = owners.find((id) => id !== activeWordId);
      onSetActive(other || owners[0], { r, c });
      return;
    }
    const wordId = owners.includes(activeWordId) ? activeWordId : owners[0];
    onSetActive(wordId, { r, c });
  }, [won, visibleOwners, activeCell, activeWordId, onSetActive]);

  const indexInActiveWord = useCallback(() => {
    if (!activeWord || !activeCell) return -1;
    return activeWord.direction === 'across'
      ? activeCell.c - activeWord.col
      : activeCell.r - activeWord.row;
  }, [activeWord, activeCell]);

  const handleChange = useCallback((e) => {
    const raw = e.target.value;
    e.target.value = '';
    if (won || !activeWord || !activeCell) return;
    const letter = raw.slice(-1).toUpperCase();
    if (!/[A-Z]/.test(letter)) return;

    onTypeLetter(activeCell.r, activeCell.c, letter);

    const idx = indexInActiveWord();
    if (idx >= 0 && idx < activeWord.length - 1) {
      const [nr, nc] = activeWord.direction === 'across'
        ? [activeWord.row, activeWord.col + idx + 1]
        : [activeWord.row + idx + 1, activeWord.col];
      moveTo(nr, nc, activeWordId);
    }
    // At the word's last cell: stay put (simpler, more predictable).
  }, [won, activeWord, activeCell, activeWordId, onTypeLetter, indexInActiveWord, moveTo]);

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      e.target.blur();
      return;
    }

    if (won || !activeWord || !activeCell) return;

    if (e.key === 'Backspace') {
      e.preventDefault();
      const key = cellKey(activeCell.r, activeCell.c);
      if (entries[key]) {
        onClearCell(activeCell.r, activeCell.c);
        return;
      }
      const idx = indexInActiveWord();
      if (idx > 0) {
        const [pr, pc] = activeWord.direction === 'across'
          ? [activeWord.row, activeWord.col + idx - 1]
          : [activeWord.row + idx - 1, activeWord.col];
        onClearCell(pr, pc);
        moveTo(pr, pc, activeWordId);
      }
      return;
    }

    const arrowDelta = {
      ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1],
    }[e.key];
    if (arrowDelta) {
      e.preventDefault();
      const [dr, dc] = arrowDelta;
      moveTo(activeCell.r + dr, activeCell.c + dc, activeWordId);
      return;
    }

    if (e.key === 'Tab') {
      e.preventDefault();
      const order = puzzle.words
        .filter((w) => visibleIds.has(w.id))
        .sort((a, b) => a.row - b.row || a.col - b.col || a.id.localeCompare(b.id));
      const curIdx = order.findIndex((w) => w.id === activeWordId);
      const step = e.shiftKey ? -1 : 1;
      const next = order[(curIdx + step + order.length) % order.length];
      if (next) onSetActive(next.id, { r: next.row, c: next.col });
    }
  }, [won, activeWord, activeCell, activeWordId, entries, indexInActiveWord, moveTo, onClearCell, puzzle.words, visibleIds, onSetActive]);

  const rows = [];
  for (let r = 0; r < puzzle.height; r++) {
    const cols = [];
    for (let c = 0; c < puzzle.width; c++) {
      const owners = visibleOwners(r, c);
      const key = cellKey(r, c);
      if (owners.length === 0) {
        cols.push(<span key={c} className={styles.gap} />);
        continue;
      }
      const letter = entries[key] || '';
      const isActive = activeCell && activeCell.r === r && activeCell.c === c;
      const isInActiveWord = activeCellSet.has(key);
      const isSolved = owners.every((id) => solvedIds.has(id));
      const isFresh = owners.some((id) => justRevealed.has(id));
      const classes = [styles.cell];
      if (isInActiveWord) classes.push(styles.inActiveWord);
      if (isActive) classes.push(styles.active);
      if (isSolved) classes.push(styles.solved);
      if (isFresh) classes.push(styles.sprouting);
      cols.push(
        <button
          key={c}
          type="button"
          className={classes.join(' ')}
          onClick={() => handleCellClick(r, c)}
          data-row={r}
          data-col={c}
          aria-label={letter ? `${letter}` : 'empty cell'}
        >
          {letter}
        </button>
      );
    }
    rows.push(
      <div key={r} className={styles.row}>
        {cols}
      </div>
    );
  }

  return (
    <div className={styles.boardFrame}>
      <div
        className={styles.gridWrap}
        style={{ '--cols': puzzle.width, '--rows': puzzle.height }}
      >
        {rows}
      </div>
      <input
        ref={inputRef}
        className={styles.hiddenInput}
        type="text"
        inputMode="text"
        enterKeyHint="done"
        autoCapitalize="characters"
        autoComplete="off"
        autoCorrect="off"
        spellCheck="false"
        value=""
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        aria-hidden="true"
        tabIndex={-1}
      />
    </div>
  );
}
