import styles from './HowToPlay.module.css';

// A tiny 4x4 snippet: GROW across crossing RAIN down at the R.
// Every cell shown is "visible" in this example — the point is just to
// illustrate that only the seed + its first partner are on screen at all.
const EXAMPLE = [
  ['G', 'R', 'O', 'W'],
  [null, 'A', null, null],
  [null, 'I', null, null],
  [null, 'N', null, null],
];

export default function HowToPlay({ onClose }) {
  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <h2 className={styles.title}>How to Play</h2>
        <p className={styles.intro}>A crossword that grows as you solve it — the board isn't fully there until you get there.</p>

        <div className={styles.steps}>
          <div className={styles.step}>
            <span className={styles.stepIcon}>👆</span>
            <div>
              <p className={styles.stepTitle}>Tap a cell, type a letter</p>
              <p className={styles.stepDesc}>Click any visible cell and type your guess. Arrow keys and Tab move between cells.</p>
            </div>
          </div>
          <div className={styles.step}>
            <span className={styles.stepIcon}>🌱</span>
            <div>
              <p className={styles.stepTitle}>Solve a word, watch it sprout</p>
              <p className={styles.stepDesc}>You only start with the seed word and its first crossing partner. Finish a word and its hidden neighbors sprout into view.</p>
            </div>
          </div>
          <div className={styles.step}>
            <span className={styles.stepIcon}>🔀</span>
            <div>
              <p className={styles.stepTitle}>Toggle Across and Down</p>
              <p className={styles.stepDesc}>Click a crossing cell again to switch which word you're typing into.</p>
            </div>
          </div>
          <div className={styles.step}>
            <span className={styles.stepIcon}>🏁</span>
            <div>
              <p className={styles.stepTitle}>Grow the whole board</p>
              <p className={styles.stepDesc}>The puzzle solves itself the instant every sprouted word is filled in correctly — no submit button needed.</p>
            </div>
          </div>
        </div>

        <div className={styles.example}>
          <p className={styles.exampleLabel}>Starting example</p>
          <div className={styles.exampleGrid}>
            {EXAMPLE.map((row, r) => (
              <div key={r} className={styles.exRow}>
                {row.map((letter, c) => (
                  <span
                    key={c}
                    className={`${styles.exCell} ${letter ? styles.exCellSeed : styles.exCellHidden}`}
                  >
                    {letter || ''}
                  </span>
                ))}
              </div>
            ))}
          </div>
          <p className={styles.exampleCaption}>GROW crosses RAIN — that's all you see on day one. Solve either word and its other neighbors sprout in.</p>
        </div>

        <button className={styles.playButton} onClick={onClose}>
          Start playing
        </button>
      </div>
    </div>
  );
}
