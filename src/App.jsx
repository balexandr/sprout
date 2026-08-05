import { useState, useEffect } from 'react';
import { useGameState } from './hooks/useGameState';
import { useStats } from './hooks/useStats';
import SproutGrid from './components/SproutGrid';
import ClueList from './components/ClueList';
import WinScreen from './components/WinScreen';
import HowToPlay from './components/HowToPlay';
import StatsScreen from './components/StatsScreen';
import styles from './App.module.css';
import { GameLogo } from './components/GameLogo';
import { NoodleLogoIcon } from './components/NoodleLogo';
import { recordTodayShare, getCompletedTodayCount, buildShareAllText, TOTAL_GAMES } from './utils/shareAll';

const HOW_TO_PLAY_KEY = 'sprout-how-to-play-seen';

export default function App() {
  const {
    puzzle,
    dateKey,
    puzzleNumber,
    initialized,
    entries,
    setCellLetter,
    solvedIds,
    visibleIds,
    justRevealed,
    gameStatus,
    elapsedSeconds,
    timerRunning,
    generateShareText,
  } = useGameState();

  const { stats, winPct, recordGame } = useStats();

  const [showHowToPlay, setShowHowToPlay] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [winDismissed, setWinDismissed] = useState(false);
  const [activeWordId, setActiveWordId] = useState(null);
  const [activeCell, setActiveCell] = useState(null);
  const [shareAllCount, setShareAllCount] = useState(0);
  const [shareAllCopied, setShareAllCopied] = useState(false);
  const currentYear = new Date().getFullYear();

  useEffect(() => {
    try {
      if (!localStorage.getItem(HOW_TO_PLAY_KEY)) setShowHowToPlay(true);
    } catch {}
  }, []);

  const dismissHowToPlay = () => {
    setShowHowToPlay(false);
    try { localStorage.setItem(HOW_TO_PLAY_KEY, '1'); } catch {}
  };

  useEffect(() => {
    if (gameStatus === 'won') {
      recordGame(dateKey, elapsedSeconds);
      recordTodayShare('sprout', dateKey, generateShareText());
    }
  }, [gameStatus]);

  useEffect(() => {
    setShareAllCount(getCompletedTodayCount(dateKey));
  }, [gameStatus, dateKey]);

  const handleShareAll = async () => {
    const text = buildShareAllText(dateKey);
    if (!text) return;
    if (navigator.share) {
      try { await navigator.share({ text }); return; } catch {}
    }
    try { await navigator.clipboard.writeText(text); }
    catch {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.cssText = 'position:fixed;opacity:0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
    setShareAllCopied(true);
    setTimeout(() => setShareAllCopied(false), 2500);
  };

  // Default the active word to the seed the first time a puzzle loads.
  useEffect(() => {
    if (puzzle && !activeWordId) {
      const seed = puzzle.words.find((w) => w.id === puzzle.seedWordId);
      if (seed) { setActiveWordId(seed.id); setActiveCell({ r: seed.row, c: seed.col }); }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [puzzle]);

  const handleSetActive = (wordId, cell) => {
    setActiveWordId(wordId);
    setActiveCell(cell);
  };

  const handleSelectClue = (wordId) => {
    const word = puzzle.words.find((w) => w.id === wordId);
    if (!word) return;
    setActiveWordId(wordId);
    setActiveCell({ r: word.row, c: word.col });
  };

  const footer = (
    <footer className={styles.footer}>
      <a href="https://noodlegames.co" target="_blank" rel="noopener noreferrer" className={styles.footerLogo}>
        <NoodleLogoIcon size={18} /> NoodleGames
      </a>
      {shareAllCount > 0 && (
        <button
          className={`${styles.footerShareAll} ${shareAllCopied ? styles.copied : ''}`}
          onClick={handleShareAll}
        >
          {shareAllCopied ? '✓ Copied' : `⬆ Share all completed (${shareAllCount}/${TOTAL_GAMES})`}
        </button>
      )}
      <span className={styles.footerCopy}>© {currentYear} NoodleGames.co</span>
    </footer>
  );

  const Logo = () => (
    <h1 className={styles.logo}>
      <GameLogo />
      <span className={styles.logoText}>Sprout</span>
    </h1>
  );

  if (!initialized) return null;

  if (!puzzle) {
    return (
      <div className={styles.container}>
        <header className={styles.header}>
          <div className={styles.headerLeft}><Logo /></div>
        </header>
        <div className={styles.noPuzzle}>
          <span className={styles.noPuzzleEmoji}>🌱</span>
          <p>No puzzle for today yet.</p>
          <p className={styles.muted}>Check back tomorrow!</p>
        </div>
        {footer}
      </div>
    );
  }

  const totalWords = puzzle.words.length;
  const wordsSolved = solvedIds.size;

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <Logo />
          {puzzleNumber > 0 && <span className={styles.puzzleNumber}>#{puzzleNumber}</span>}
        </div>
        <div className={styles.headerRight}>
          <button className={styles.iconButton} onClick={() => setShowStats(true)} aria-label="Statistics">
            <svg className={styles.statsIcon} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
              <path d="M4 20H20" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              <rect x="6" y="11" width="2.8" height="7" rx="1" fill="currentColor" />
              <rect x="10.6" y="7" width="2.8" height="11" rx="1" fill="currentColor" opacity="0.9" />
              <rect x="15.2" y="4" width="2.8" height="14" rx="1" fill="currentColor" opacity="0.8" />
            </svg>
          </button>
          <button className={styles.iconButton} onClick={() => setShowHowToPlay(true)} aria-label="How to play">?</button>
        </div>
      </header>

      <main className={styles.main}>
        <div className={styles.statusBar}>
          <div className={styles.timerBlock}>
            <span className={styles.timerLabel}>Time</span>
            <span className={`${styles.timerValue} ${!timerRunning && gameStatus === 'playing' ? styles.timerPaused : ''}`}>
              {formatTime(elapsedSeconds)}
            </span>
          </div>
          <div className={styles.wordsBlock}>
            <span className={styles.wordsLabel}>Words</span>
            <span className={styles.wordsValue}>{wordsSolved}/{totalWords}</span>
          </div>
        </div>

        <ClueList
          puzzle={puzzle}
          visibleIds={visibleIds}
          solvedIds={solvedIds}
          activeWordId={activeWordId}
          onSelectWord={handleSelectClue}
        />

        <SproutGrid
          puzzle={puzzle}
          entries={entries}
          visibleIds={visibleIds}
          justRevealed={justRevealed}
          solvedIds={solvedIds}
          activeWordId={activeWordId}
          activeCell={activeCell}
          onSetActive={handleSetActive}
          gameStatus={gameStatus}
          onTypeLetter={(r, c, letter) => setCellLetter(r, c, letter)}
          onClearCell={(r, c) => setCellLetter(r, c, null)}
        />

        {gameStatus === 'playing' && (
          <p className={styles.hint}>
            Solve a word to sprout its hidden neighbors into view
          </p>
        )}
      </main>

      {gameStatus === 'won' && !winDismissed && (
        <WinScreen
          puzzle={puzzle}
          puzzleNumber={puzzleNumber}
          elapsedSeconds={elapsedSeconds}
          generateShareText={generateShareText}
          stats={stats}
          winPct={winPct}
          onDismiss={() => setWinDismissed(true)}
        />
      )}

      {showHowToPlay && <HowToPlay onClose={dismissHowToPlay} />}
      {showStats && <StatsScreen stats={stats} winPct={winPct} onClose={() => setShowStats(false)} />}

      {footer}
    </div>
  );
}

function formatTime(s) {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}
