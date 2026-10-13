// Sprout's own definition of what counts as winning: solve time,
// lower is better (matches the 'asc' sort_direction seeded for
// 'sprout' in leaderboard_games). Every game writes its own version
// of this — the shared leaderboard.js never needs to know what
// elapsedSeconds means.
export function toLeaderboardScore(elapsedSeconds) {
  const mm = String(Math.floor(elapsedSeconds / 60)).padStart(2, '0')
  const ss = String(elapsedSeconds % 60).padStart(2, '0')
  return { score: elapsedSeconds, tiebreak: null, scoreDisplay: `${mm}:${ss}` }
}
