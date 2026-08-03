export function GameLogo() {
  const green = '#22c55e';
  const light = '#4ade80';

  return (
    <svg viewBox="0 0 48 48" width="26" height="26" aria-hidden="true" style={{ flexShrink: 0 }}>
      {/* Stem, curving up from the seed */}
      <path
        d="M 24 42 C 24 32 22 26 24 18"
        fill="none" stroke={green} strokeWidth="3.4" strokeLinecap="round"
      />
      {/* Left leaf, unfurling outward */}
      <path
        d="M 24 26 C 16 26 11 21 12 13 C 20 13 25 18 24 26 Z"
        fill={green}
      />
      {/* Right leaf, unfurling outward */}
      <path
        d="M 24 19 C 31 19 36 15 36 8 C 29 8 24 12 24 19 Z"
        fill={light}
      />
      {/* Seed */}
      <ellipse cx="24" cy="43.5" rx="4.5" ry="3" fill={light} />
    </svg>
  );
}
