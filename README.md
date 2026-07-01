# HaPaX Word Blitz Practice Lab

This is a Next.js practice app for Word Blitz-style 4×4 boards.

## What was added

- Practice mode with no score and no multiplier.
- Normal scoring mode with R1/R2/R3 bonus layouts.
- Event modes:
  - Inspiration: every 5 manually found words grants one clickable hint for a random 5+ word.
  - 5+ bonus: +50 points for every accepted word of length 5 or more.
  - Blitz: 30-second timer, +1 second for every accepted word.
  - 4+ words: only words of length 4 or more are counted.
  - Quadruple bonus: R4 layout with 4W/4L support.
  - Evolution: tile levels advance through +5, +10, +50 and maxed tiles become pale purple.
- Custom arena modes:
  - Gladiator: only 5+ words count; valid shorter words add penalties.
  - Tight rope: only length-4 words count; other valid lengths add penalties.
  - 8+ superior: normal play, length-8+ words add kudos.
- Training mode for Q/X/Z/J boards. The selected rare letter is forced onto the board and receives a multiplier; when word multipliers are available, it is preferentially placed on one.
- Word list route preview: clicking a word highlights a feasible route. If multiple routes exist, the highest-scoring route is selected.
- Refactored Word Blitz scoring/generation helpers into `app/lib/wordblitz.ts`.
- Added Prettier config and npm format scripts.
- Added Vitest coverage for the Word Blitz scoring engine, bonus generation, route search, tile rendering, and swipe submission behavior.
- Fixed a duplicate mouse-up submission bug in `SquareBoard` that could submit the same mouse swipe twice because both the board and window handlers processed the same release event.

## Run locally

```bash
npm install
npm run dev
```

Then open:

```text
http://localhost:3000/random-board
```

The home page also links to the practice lab.

## Verify

```bash
npm test
./node_modules/.bin/tsc --noEmit
npm run format:check -- --ignore-unknown
npm run build
```

The Vitest suite currently contains 51 tests. Existing unrelated React hook warnings may still appear in the older board/create pages during `npm run build`.

## Useful commands

```bash
npm run dev          # local development
npm run build        # production build/type check
npm run start        # serve production build after building
npm run test         # run Vitest suite
npm run test:watch   # run Vitest in watch mode
npm run format       # format source files with Prettier
npm run format:check # check formatting
```
