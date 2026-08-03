import styles from './StatsScreen.module.css';

function pad(n) { return String(n).padStart(2, '0'); }

function formatTime(s) {
  if (s === null || s === undefined) return '--:--';
  return `${pad(Math.floor(s / 60))}:${pad(s % 60)}`;
}

export default function StatsScreen({ stats, winPct, onClose }) {
  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h2 className={styles.title}>Statistics</h2>
          <button className={styles.closeBtn} onClick={onClose} aria-label="Close">✕</button>
        </div>

        <div className={styles.statsGrid}>
          <div className={styles.statItem}>
            <span className={styles.statValue}>{stats.gamesPlayed}</span>
            <span className={styles.statLabel}>Played</span>
          </div>
          <div className={styles.statItem}>
            <span className={styles.statValue}>{winPct}%</span>
            <span className={styles.statLabel}>Win rate</span>
          </div>
          <div className={styles.statItem}>
            <span className={styles.statValue}>{stats.currentStreak}</span>
            <span className={styles.statLabel}>Streak</span>
          </div>
          <div className={styles.statItem}>
            <span className={styles.statValue}>{stats.maxStreak}</span>
            <span className={styles.statLabel}>Best streak</span>
          </div>
        </div>

        <div className={styles.timeStats}>
          <div className={styles.timeItem}>
            <span className={styles.timeLabel}>Best time</span>
            <span className={styles.timeValue}>{formatTime(stats.bestTime)}</span>
          </div>
          <div className={styles.timeDivider} />
          <div className={styles.timeItem}>
            <span className={styles.timeLabel}>Avg time</span>
            <span className={styles.timeValue}>
              {stats.gamesPlayed > 0 ? formatTime(Math.round(stats.totalTime / stats.gamesPlayed)) : '--:--'}
            </span>
          </div>
        </div>

        <button className={styles.doneButton} onClick={onClose}>Done</button>
      </div>
    </div>
  );
}
