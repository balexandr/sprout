import styles from './Keyboard.module.css';

// On-screen QWERTY keyboard. Replaces the old hidden-input-focus trick that
// summoned (and dismissed) the native mobile keyboard on every cell tap,
// which yanked the viewport around. This is the only touch input surface
// now — physical/bluetooth keyboards are still handled separately by a
// window-level keydown listener in SproutGrid.
const ROWS = [
  ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
  ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
  ['Z', 'X', 'C', 'V', 'B', 'N', 'M'],
];

export default function Keyboard({ onKey, onBackspace, disabled }) {
  return (
    <div className={styles.keyboard} role="group" aria-label="On-screen keyboard">
      {ROWS.map((row, i) => (
        <div key={i} className={styles.row}>
          {row.map((letter) => (
            <button
              key={letter}
              type="button"
              className={styles.key}
              disabled={disabled}
              onClick={() => onKey(letter)}
            >
              {letter}
            </button>
          ))}
          {i === 2 && (
            <button
              type="button"
              className={`${styles.key} ${styles.backspace}`}
              disabled={disabled}
              aria-label="Backspace"
              onClick={onBackspace}
            >
              ⌫
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
