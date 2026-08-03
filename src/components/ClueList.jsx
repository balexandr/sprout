import { useEffect, useRef } from 'react';
import styles from './ClueList.module.css';

function ClueGroup({ title, words, activeWordId, solvedIds, onSelect }) {
  if (words.length === 0) return null;
  return (
    <div className={styles.group}>
      <p className={styles.groupTitle}>{title}</p>
      <ul className={styles.list}>
        {words.map((w) => {
          const isActive = w.id === activeWordId;
          const isSolved = solvedIds.has(w.id);
          return (
            <ClueItem
              key={w.id}
              word={w}
              isActive={isActive}
              isSolved={isSolved}
              onSelect={onSelect}
            />
          );
        })}
      </ul>
    </div>
  );
}

function ClueItem({ word, isActive, isSolved, onSelect }) {
  const ref = useRef(null);
  useEffect(() => {
    if (isActive) ref.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [isActive]);

  const classes = [styles.item];
  if (isActive) classes.push(styles.active);
  if (isSolved) classes.push(styles.solved);

  return (
    <li>
      <button
        ref={ref}
        type="button"
        className={classes.join(' ')}
        onClick={() => onSelect(word.id)}
      >
        <span className={styles.itemLength}>{word.length}</span>
        <span className={styles.itemClue}>{word.clue}</span>
        {isSolved && <span className={styles.itemCheck}>✓</span>}
      </button>
    </li>
  );
}

export default function ClueList({ puzzle, visibleIds, solvedIds, activeWordId, onSelectWord }) {
  const visibleWords = puzzle.words.filter((w) => visibleIds.has(w.id));
  const across = visibleWords.filter((w) => w.direction === 'across').sort((a, b) => a.row - b.row || a.col - b.col);
  const down = visibleWords.filter((w) => w.direction === 'down').sort((a, b) => a.row - b.row || a.col - b.col);

  return (
    <div className={styles.container}>
      <ClueGroup title="Across" words={across} activeWordId={activeWordId} solvedIds={solvedIds} onSelect={onSelectWord} />
      <ClueGroup title="Down" words={down} activeWordId={activeWordId} solvedIds={solvedIds} onSelect={onSelectWord} />
    </div>
  );
}
