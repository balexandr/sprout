import { useEffect, useMemo, useCallback } from 'react';
import Keyboard from './Keyboard';
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
  interactionDisabled,
  showHint,
}) {
  const won = gameStatus === 'won';
  const locked = won || interactionDisabled;

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

  // A cell is locked once ANY word that owns it is already solved — that
  // letter is guaranteed correct, so typing skips past it and backspace
  // steps over it instead of deleting it. This covers both a solved
  // crossing word and the active word itself once it's been completed, so
  // a finished word can't be derailed by a stray backspace or overwrite.
  const isCellLocked = useCallback((r, c) => {
    return visibleOwners(r, c).some((id) => solvedIds.has(id));
  }, [visibleOwners, solvedIds]);

  const wordOrder = useMemo(() => (
    puzzle.words
      .filter((w) => visibleIds.has(w.id))
      .sort((a, b) => a.row - b.row || a.col - b.col || a.id.localeCompare(b.id))
  ), [puzzle.words, visibleIds]);

  const goToWordOffset = useCallback((fromId, step) => {
    const curIdx = wordOrder.findIndex((w) => w.id === fromId);
    if (curIdx === -1) return;
    const next = wordOrder[(curIdx + step + wordOrder.length) % wordOrder.length];
    if (next) onSetActive(next.id, { r: next.row, c: next.col });
  }, [wordOrder, onSetActive]);

  const activeWord = activeWordId ? wordsById[activeWordId] : null;

  const activeCellSet = useMemo(() => {
    if (!activeWord) return new Set();
    return new Set(cellsFor(activeWord).map(([r, c]) => cellKey(r, c)));
  }, [activeWord]);

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

  // Types one letter into the active cell and advances - shared by the
  // on-screen keyboard (tap) and the window-level keydown listener below
  // (physical keyboard), so both input paths get identical skip/advance
  // behavior instead of drifting apart.
  const typeLetter = useCallback((raw) => {
    if (locked || !activeWord || !activeCell) return;
    const letter = String(raw).slice(-1).toUpperCase();
    if (!/[A-Z]/.test(letter)) return;

    // Never overwrite a letter that's part of an already-solved word — the
    // cursor still advances as normal below, the write just no-ops.
    if (!isCellLocked(activeCell.r, activeCell.c)) {
      onTypeLetter(activeCell.r, activeCell.c, letter);
    }

    const idx = indexInActiveWord();
    if (idx < 0) return;

    if (idx < activeWord.length - 1) {
      // Skip forward past cells locked in by an already-solved word.
      let nextIdx = idx + 1;
      while (nextIdx < activeWord.length - 1) {
        const [nr, nc] = activeWord.direction === 'across'
          ? [activeWord.row, activeWord.col + nextIdx]
          : [activeWord.row + nextIdx, activeWord.col];
        if (!isCellLocked(nr, nc)) break;
        nextIdx++;
      }
      const [nr, nc] = activeWord.direction === 'across'
        ? [activeWord.row, activeWord.col + nextIdx]
        : [activeWord.row + nextIdx, activeWord.col];
      moveTo(nr, nc, activeWordId);
    } else {
      // Just filled the word's last cell — jump to the next word so mobile
      // users aren't hunting for the next tappable cell under the keyboard.
      goToWordOffset(activeWordId, 1);
    }
  }, [locked, activeWord, activeCell, activeWordId, onTypeLetter, indexInActiveWord, moveTo, isCellLocked, goToWordOffset]);

  const doBackspace = useCallback(() => {
    if (locked || !activeWord || !activeCell) return;
    const key = cellKey(activeCell.r, activeCell.c);
    // A locked cell (part of an already-solved word) is never deleted —
    // backspace just steps the cursor back over it instead.
    if (entries[key] && !isCellLocked(activeCell.r, activeCell.c)) {
      onClearCell(activeCell.r, activeCell.c);
      return;
    }
    const idx = indexInActiveWord();
    if (idx > 0) {
      const [pr, pc] = activeWord.direction === 'across'
        ? [activeWord.row, activeWord.col + idx - 1]
        : [activeWord.row + idx - 1, activeWord.col];
      if (!isCellLocked(pr, pc)) onClearCell(pr, pc);
      moveTo(pr, pc, activeWordId);
    }
  }, [locked, activeWord, activeCell, activeWordId, entries, indexInActiveWord, moveTo, onClearCell, isCellLocked]);

  // Physical/bluetooth keyboards still work (arrows, tab, letters, backspace)
  // via a plain window-level listener — no hidden <input> needed to catch
  // them, so there's nothing for a mobile browser to pop a native keyboard
  // for. The on-screen Keyboard below is the only touch input surface now.
  useEffect(() => {
    if (locked || !activeWord || !activeCell) return;

    function onWindowKeyDown(e) {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const tag = document.activeElement?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;

      if (e.key === 'Backspace') { e.preventDefault(); doBackspace(); return; }

      const arrowDelta = {
        ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1],
      }[e.key];
      if (arrowDelta) {
        e.preventDefault();
        moveTo(activeCell.r + arrowDelta[0], activeCell.c + arrowDelta[1], activeWordId);
        return;
      }

      if (e.key === 'Tab') {
        e.preventDefault();
        goToWordOffset(activeWordId, e.shiftKey ? -1 : 1);
        return;
      }

      if (e.key.length === 1 && /[a-zA-Z]/.test(e.key)) {
        e.preventDefault();
        typeLetter(e.key);
      }
    }

    window.addEventListener('keydown', onWindowKeyDown);
    return () => window.removeEventListener('keydown', onWindowKeyDown);
  }, [locked, activeWord, activeCell, activeWordId, doBackspace, moveTo, goToWordOffset, typeLetter]);

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
    <>
      <div className={styles.boardFrame}>
        <div
          className={styles.gridWrap}
          style={{ '--cols': puzzle.width, '--rows': puzzle.height }}
        >
          {rows}
        </div>
      </div>
      {showHint && (
        <p className={styles.hint}>
          Solve a word to sprout its hidden neighbors into view
        </p>
      )}
      <Keyboard onKey={typeLetter} onBackspace={doBackspace} disabled={locked} />
    </>
  );
}
