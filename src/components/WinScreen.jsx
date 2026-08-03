import { useState, useEffect } from 'react';
import styles from './WinScreen.module.css';

function getTimeToMidnight() {
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);
  const diff = tomorrow - now;
  return {
    hours: Math.floor(diff / 3600000),
    minutes: Math.floor((diff % 3600000) / 60000),
    seconds: Math.floor((diff % 60000) / 1000),
  };
}

function pad(n) { return String(n).padStart(2, '0'); }

function formatTime(s) {
  return `${pad(Math.floor(s / 60))}:${pad(s % 60)}`;
}

function getRating(seconds) {
  if (seconds < 90) return { emoji: '🏆', label: 'Full Bloom' };
  if (seconds < 180) return { emoji: '🌿', label: 'Thriving' };
  if (seconds < 360) return { emoji: '🌱', label: 'Sprouted' };
  return { emoji: '🍃', label: 'Grown' };
}

export default function WinScreen({ puzzle, puzzleNumber, elapsedSeconds, generateShareText, stats, winPct, onDismiss }) {
  const [copied, setCopied] = useState(false);
  const [countdown, setCountdown] = useState(getTimeToMidnight());
  const [showContent, setShowContent] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setShowContent(true), 120);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => setCountdown(getTimeToMidnight()), 1000);
    return () => clearInterval(interval);
  }, []);

  const rating = getRating(elapsedSeconds);
  const shareText = generateShareText();
  const wordCount = puzzle.words.length;
  const longestWord = Math.max(...puzzle.words.map((w) => w.length));

  const handleShare = async () => {
    if (navigator.share) {
      try { await navigator.share({ text: shareText }); return; } catch {}
    }
    try { await navigator.clipboard.writeText(shareText); }
    catch {
      const ta = document.createElement('textarea');
      ta.value = shareText;
      ta.style.cssText = 'position:fixed;opacity:0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className={`${styles.overlay} ${showContent ? styles.visible : ''}`}>
      <div className={styles.modal}>
        <div className={styles.sparkContainer} aria-hidden="true">
          {puzzle.words.map((w, i) => (
            <span key={w.id} className={styles.spark} style={{
              left: `${10 + i * (80 / Math.max(wordCount - 1, 1))}%`,
              top: `${Math.random() * 100}%`,
              background: i % 2 === 0 ? '#22c55e' : '#4ade80',
              boxShadow: '0 0 4px #22c55e, 0 0 8px #22c55e88',
              animationDelay: `${Math.random() * 2}s`,
              animationDuration: `${1.5 + Math.random() * 2}s`,
            }} />
          ))}
        </div>

        <div className={styles.resultHeader}>
          <button className={styles.dismissBtn} onClick={onDismiss} aria-label="Close">✕</button>
          <span className={styles.ratingEmoji}>{rating.emoji}</span>
          <h2 className={styles.title}>{rating.label}!</h2>
          <p className={styles.subtitle}>Sprout #{puzzleNumber} — fully grown</p>
        </div>

        <div className={styles.metricsRow}>
          <div className={styles.metric}>
            <span className={styles.metricValue}>{formatTime(elapsedSeconds)}</span>
            <span className={styles.metricLabel}>Time</span>
          </div>
          <div className={styles.metricDivider} />
          <div className={styles.metric}>
            <span className={styles.metricValue}>{wordCount}</span>
            <span className={styles.metricLabel}>Words</span>
          </div>
          <div className={styles.metricDivider} />
          <div className={styles.metric}>
            <span className={styles.metricValue}>{longestWord}</span>
            <span className={styles.metricLabel}>Longest</span>
          </div>
        </div>

        <div className={styles.statsRow}>
          <div className={styles.statItem}>
            <span className={styles.statValue}>{stats.gamesPlayed}</span>
            <span className={styles.statLabel}>Played</span>
          </div>
          <div className={styles.statItem}>
            <span className={styles.statValue}>{winPct}%</span>
            <span className={styles.statLabel}>Win %</span>
          </div>
          <div className={styles.statItem}>
            <span className={styles.statValue}>{stats.currentStreak}</span>
            <span className={styles.statLabel}>Streak</span>
          </div>
          <div className={styles.statItem}>
            <span className={styles.statValue}>{stats.maxStreak}</span>
            <span className={styles.statLabel}>Best</span>
          </div>
        </div>

        <div className={styles.sharePreview}>
          <p className={styles.sharePreviewLabel}>Share text</p>
          <div className={styles.sharePreviewBox}>
            {shareText.split('\n').map((line, i) => (
              <span key={i} className={styles.sharePreviewLine}>{line}</span>
            ))}
          </div>
        </div>

        <button
          className={`${styles.shareButton} ${copied ? styles.copied : ''}`}
          onClick={handleShare}
        >
          {copied ? '✓ Copied to clipboard' : '⬆ Share your result'}
        </button>

        <div className={styles.countdown}>
          <span className={styles.countdownLabel}>Next puzzle in</span>
          <span className={styles.countdownTime}>
            {pad(countdown.hours)}:{pad(countdown.minutes)}:{pad(countdown.seconds)}
          </span>
        </div>
      </div>
    </div>
  );
}
