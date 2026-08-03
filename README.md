# Sprout — Daily Growing Crossword

A daily mini-crossword where the grid isn't fully visible upfront. You start with just the seed word and its first crossing partner — solve a word, and its hidden neighbors sprout into view. A different shape grows every day.

Part of the [NoodleGames](https://noodlegames.co) family alongside **Pathways** and **Knot**.

---

## How to play

Click a cell and type your guess. Arrow keys and Tab move between cells; click a crossing cell again to switch between its Across and Down word.

- You only start with the seed word and its first crossing partner — everything else is hidden.
- Finish a word and any not-yet-revealed neighbors crossing it sprout into view.
- No submit button: the puzzle solves itself the instant every sprouted word is filled in correctly.
- Resets daily at **midnight ET**.

---

## Sharing

After a solve you can share your time and word count — no spoilers, just a result line. Once you've finished at least one NoodleGame today, a **Share all completed** button appears in the footer, letting you share every game you've solved today in one message.

---

## Stack

React + Vite · CSS Modules · localStorage · GitHub Pages

---

## Puzzles

Puzzles run from **August 3, 2026** onward (180 days, through January 2027), stored in `src/data/puzzles.json` keyed by date. Each entry has a bounding-box size, a seed word id, and a list of placed words (answer, clue, direction, position, length) — crossings are derived at runtime from shared cell coordinates, not stored.

Difficulty follows the day of the week — easiest on Monday, climbing daily, hardest on Sunday, then resetting:

| Day | Words | Length range |
|---|---|---|
| Monday | 6 | 3–6 |
| Tuesday | 7 | 3–6 |
| Wednesday | 8 | 3–7 |
| Thursday | 8 | 4–7 |
| Friday | 9 | 4–7 |
| Saturday | 10 | 4–8 |
| Sunday | 11 | 4–8 |

Puzzles are generated, not hand-written: `scripts/generate-puzzles.mjs` places a seed word, then repeatedly attaches perpendicular crossing words from `scripts/dictionary.json` (a curated pool of ~700 common words with clues) at compatible letters, respecting standard crossword adjacency rules — no black squares, so cells alongside a word (other than its one legitimate crossing) must stay empty to keep the shape legible. Re-run with `npm run generate-puzzles` to extend or regenerate the set.
