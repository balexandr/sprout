// Offline puzzle generator for Sprout.
//
// Each puzzle is a small crossword built by randomized backtracking: place a
// seed word, then repeatedly attach perpendicular crossing words from the
// dictionary at compatible letters, respecting standard crossword adjacency
// rules (no accidental parallel word collisions — there are no black squares
// here, so this rule is what keeps the shape legible). The client doesn't
// see this algorithm at all — it only ever loads the resolved
// src/data/puzzles.json this script writes.
import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

// NOTE: this EPOCH must stay in sync with src/hooks/useGameState.js — that
// file computes puzzleNumber from the same constant at runtime. Changing
// one without the other breaks puzzle numbering (bit us once on `pathways`).
const EPOCH = '2026-08-03';
const NUM_DAYS = 180;

const MAX_SPAN = 10; // hard cap on bounding box width/height

// Minimum days before a word can be reused across the whole run — without
// this, short common-letter words (ANTS, EGGS, TOFU...) get picked far more
// often than others since they match nearly every crossing opportunity,
// and can land on back-to-back or even the same-week days.
const COOLDOWN_DAYS = 28;

// Difficulty climbs Monday -> Sunday, resets Monday, same weekly cadence
// established on the `pathways` sibling game.
const WEEKLY_DIFFICULTY = [
  { wordCount: 6, minLen: 3, maxLen: 6 },  // Monday
  { wordCount: 7, minLen: 3, maxLen: 6 },  // Tuesday
  { wordCount: 8, minLen: 3, maxLen: 7 },  // Wednesday
  { wordCount: 8, minLen: 4, maxLen: 7 },  // Thursday
  { wordCount: 9, minLen: 4, maxLen: 7 },  // Friday
  { wordCount: 10, minLen: 4, maxLen: 8 }, // Saturday
  { wordCount: 11, minLen: 4, maxLen: 8 }, // Sunday
];

function difficultyForDate(dateKey) {
  const utcDay = new Date(`${dateKey}T00:00:00Z`).getUTCDay(); // Sun=0..Sat=6
  const mondayIndexed = (utcDay + 6) % 7; // Mon=0..Sun=6
  return WEEKLY_DIFFICULTY[mondayIndexed];
}

// djb2 string hash -> uint32 seed
function hashSeed(str) {
  let h = 5381;
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) + h + str.charCodeAt(i)) >>> 0;
  }
  return h >>> 0;
}

// mulberry32 PRNG
function mulberry32(seed) {
  let a = seed;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle(arr, rng) {
  const out = arr.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function pick(arr, rng) {
  return arr[Math.floor(rng() * arr.length)];
}

// ── Dictionary ──────────────────────────────────────────────────────────
function loadDictionary() {
  const raw = JSON.parse(readFileSync(join(__dirname, 'dictionary.json'), 'utf8'));
  const entries = raw.map((e) => ({ word: e.word.toUpperCase(), clue: e.clue }));

  const byLength = new Map();
  const letterIndex = new Map(); // letter -> entries containing it

  for (const entry of entries) {
    const len = entry.word.length;
    if (!byLength.has(len)) byLength.set(len, []);
    byLength.get(len).push(entry);

    const seenLetters = new Set(entry.word);
    for (const letter of seenLetters) {
      if (!letterIndex.has(letter)) letterIndex.set(letter, []);
      letterIndex.get(letter).push(entry);
    }
  }

  return { entries, byLength, letterIndex };
}

// ── Grid helpers ────────────────────────────────────────────────────────
function key(r, c) { return `${r},${c}`; }

function cellsFor(direction, row, col, length) {
  const cells = [];
  for (let k = 0; k < length; k++) {
    cells.push(direction === 'across' ? [row, col + k, k] : [row + k, col, k]);
  }
  return cells;
}

// Validate placing `word` (direction/row/col/length) into the grid, crossing
// the existing letter at (crossR, crossC) via the word's own index `j`.
// Returns the placement's cell list + updated bbox on success, or null.
function tryPlace({ word, direction, row, col, length, j }, occupied, bbox) {
  const cells = cellsFor(direction, row, col, length);

  let { minR, maxR, minC, maxC } = bbox;
  for (const [r, c] of cells) {
    minR = Math.min(minR, r); maxR = Math.max(maxR, r);
    minC = Math.min(minC, c); maxC = Math.max(maxC, c);
  }
  if (maxR - minR + 1 > MAX_SPAN || maxC - minC + 1 > MAX_SPAN) return null;

  // Cells immediately beyond each end (along the word's own axis) must be
  // empty — prevents silently extending an existing word.
  const before = direction === 'across' ? key(row, col - 1) : key(row - 1, col);
  const after = direction === 'across' ? key(row, col + length) : key(row + length, col);
  if (occupied.has(before) || occupied.has(after)) return null;

  for (const [r, c, k] of cells) {
    const cellKey = key(r, c);
    if (k === j) {
      // The one legitimate crossing cell — must already hold this exact
      // letter (it's occupied by the word we're crossing). No adjacency
      // check here: the cells alongside it *are* that word's own cells.
      const existing = occupied.get(cellKey);
      if (existing !== undefined && existing !== word[k]) return null;
      continue;
    }
    if (occupied.has(cellKey)) return null; // must be empty
    // Black-square-free adjacency rule: the cells alongside this one
    // (perpendicular to the word's own axis) must also be empty, or two
    // parallel words could run touching with no gap between them.
    const [n1, n2] = direction === 'across'
      ? [key(r - 1, c), key(r + 1, c)]
      : [key(r, c - 1), key(r, c + 1)];
    if (occupied.has(n1) || occupied.has(n2)) return null;
  }

  return { cells, bbox: { minR, maxR, minC, maxC } };
}

function commit(placed, occupied, cells, word) {
  for (const [r, c, k] of cells) occupied.set(key(r, c), word[k]);
}

// ── Puzzle generation for one date ─────────────────────────────────────
function generatePuzzle(dateKey, dict, dayIndex, lastUsedDay) {
  const { wordCount, minLen, maxLen } = difficultyForDate(dateKey);
  const rng = mulberry32(hashSeed(dateKey));

  const lengthsInRange = [];
  for (let l = minLen; l <= maxLen; l++) if (dict.byLength.has(l)) lengthsInRange.push(l);

  const maxAttempts = 60;
  const stepBudget = 4000;

  const isOnCooldown = (word) => {
    const last = lastUsedDay.get(word);
    return last !== undefined && dayIndex - last < COOLDOWN_DAYS;
  };

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const placed = [];
    const occupied = new Map();
    const usedWords = new Set();
    const frontier = []; // { word, direction, row, col, length, ownIndex }
    let steps = 0;

    // Seed: bias toward the longer half of the day's range for a good
    // starting crossing surface.
    const seedLenPool = lengthsInRange.filter((l) => l >= Math.ceil((minLen + maxLen) / 2));
    const seedLen = pick(seedLenPool.length ? seedLenPool : lengthsInRange, rng);
    const seedCandidates = dict.byLength.get(seedLen) || [];
    if (!seedCandidates.length) continue;
    const availableSeedCandidates = seedCandidates.filter((e) => !isOnCooldown(e.word));
    const seedEntry = pick(availableSeedCandidates.length ? availableSeedCandidates : seedCandidates, rng);

    const seed = {
      id: 'w0', answer: seedEntry.word, clue: seedEntry.clue,
      direction: 'across', row: 0, col: 0, length: seedEntry.word.length,
    };
    for (const [r, c, k] of cellsFor('across', 0, 0, seed.length)) occupied.set(key(r, c), seed.answer[k]);
    placed.push(seed);
    usedWords.add(seed.answer);
    for (let i = 0; i < seed.length; i++) frontier.push({ parent: seed, index: i });

    let bbox = { minR: 0, maxR: 0, minC: 0, maxC: seed.length - 1 };
    let failed = false;

    while (placed.length < wordCount) {
      if (frontier.length === 0) { failed = true; break; }
      if (++steps > stepBudget) { failed = true; break; }

      const pickIdx = Math.floor(rng() * frontier.length);
      const { parent, index } = frontier[pickIdx];
      frontier.splice(pickIdx, 1);

      const letter = parent.answer[index];
      const crossR = parent.direction === 'across' ? parent.row : parent.row + index;
      const crossC = parent.direction === 'across' ? parent.col + index : parent.col;
      const newDirection = parent.direction === 'across' ? 'down' : 'across';

      const candidates = shuffle(
        (dict.letterIndex.get(letter) || []).filter(
          (e) => !usedWords.has(e.word) && !isOnCooldown(e.word) && e.word.length >= minLen && e.word.length <= maxLen
        ),
        rng
      );

      let placedThisRound = false;
      for (const candidate of candidates) {
        const matchIndices = [];
        for (let k = 0; k < candidate.word.length; k++) if (candidate.word[k] === letter) matchIndices.push(k);
        const shuffledIndices = shuffle(matchIndices, rng);

        for (const j of shuffledIndices) {
          const row = newDirection === 'across' ? crossR : crossR - j;
          const col = newDirection === 'across' ? crossC - j : crossC;
          const result = tryPlace(
            { word: candidate.word, direction: newDirection, row, col, length: candidate.word.length, j },
            occupied, bbox
          );
          if (!result) continue;

          commit(placed, occupied, result.cells, candidate.word);
          bbox = result.bbox;
          const newWord = {
            id: `w${placed.length}`, answer: candidate.word, clue: candidate.clue,
            direction: newDirection, row, col, length: candidate.word.length,
          };
          placed.push(newWord);
          usedWords.add(candidate.word);
          for (let k = 0; k < newWord.length; k++) if (k !== j) frontier.push({ parent: newWord, index: k });
          placedThisRound = true;
          break;
        }
        if (placedThisRound) break;
      }
      // If nothing validated for this frontier point, it's simply discarded
      // (already spliced out above) — loop continues with the next point.
    }

    if (failed || placed.length < wordCount) continue;

    // Normalize: shift so min row/col = 0.
    const { minR, minC, maxR, maxC } = bbox;
    const words = placed.map((w) => ({
      id: w.id, answer: w.answer, clue: w.clue, direction: w.direction,
      row: w.row - minR, col: w.col - minC, length: w.length,
    }));

    return {
      seedWordId: 'w0',
      width: maxC - minC + 1,
      height: maxR - minR + 1,
      words,
    };
  }

  throw new Error(`Failed to generate a puzzle for ${dateKey} after ${maxAttempts} attempts`);
}

function formatDateKey(date) {
  return date.toISOString().slice(0, 10);
}

function main() {
  const dict = loadDictionary();
  const puzzles = {};
  const lastUsedDay = new Map(); // word -> day index it was last used, for the cooldown check
  const start = new Date(`${EPOCH}T00:00:00Z`);

  for (let i = 0; i < NUM_DAYS; i++) {
    const d = new Date(start);
    d.setUTCDate(d.getUTCDate() + i);
    const dateKey = formatDateKey(d);
    const puzzle = generatePuzzle(dateKey, dict, i, lastUsedDay);
    puzzles[dateKey] = puzzle;
    for (const w of puzzle.words) lastUsedDay.set(w.answer, i);
  }

  const outPath = join(__dirname, '..', 'src', 'data', 'puzzles.json');
  writeFileSync(outPath, JSON.stringify(puzzles, null, 2));
  console.log(`Generated ${NUM_DAYS} puzzles -> ${outPath}`);
}

main();
