# HaPaX Word Blitz Practice Lab

HaPaX is a Next.js app for creating, browsing, and practicing Word Blitz-style 4x4 word boards. The main practice surface is `/random-board`, which can generate scored boards, event boards, arena variants, and rare-letter training boards.

## Package Management

This repo uses `pnpm` only.

Keep:

- `package.json`
- `pnpm-lock.yaml`

Do not commit:

- `package-lock.json`
- `yarn.lock`

Use these commands when changing dependencies:

```bash
pnpm install
pnpm add <package>
pnpm remove <package>
```

Avoid `npm install` in this repo. npm updates `package-lock.json`, while Vercel detects `pnpm-lock.yaml` and installs with pnpm. Updating only the npm lockfile can make Vercel fail with an outdated pnpm lockfile.

## Run Locally

```bash
pnpm install
pnpm dev
```

Then open:

```text
http://localhost:3000/random-board
```

## Verify

```bash
pnpm test
pnpm exec tsc --noEmit
pnpm run format:check
pnpm build
```

The Vitest suite currently contains 61 tests. Existing React hook dependency warnings may still appear in older board/create pages during `pnpm build`.

## Useful Commands

```bash
pnpm dev          # local development
pnpm build        # production build/type check
pnpm start        # serve production build after building
pnpm test         # run Vitest suite
pnpm test:watch   # run Vitest in watch mode
pnpm format       # format source files with Prettier
pnpm format:check # check formatting
```

## Runtime

The project declares Node 24 in `package.json`:

```json
"engines": {
  "node": "24.x"
}
```

Vercel should use that setting for deployments. Keeping the Vercel project setting on Node 24 as well is recommended so the dashboard matches the repo.

## Project Structure

```text
app/
  api/
    revalidate/route.ts              # cache revalidation endpoint
    wordlist/route.ts                # serves the word list to client components
  boards/
    page.tsx                         # saved board list route
    boards-client.tsx                # saved board browser/filter client UI
    [id]/
      page.tsx                       # saved board detail route
      board-client.tsx               # playable saved board client UI
  create/
    page.tsx                         # board creation flow
  dictionary/
    page.tsx                         # dictionary lookup page
  lib/
    actions.ts                       # server actions
    data.ts                          # data access helpers
    definitions.ts                   # shared app types
    dictionary.ts                    # dictionary helpers
    dictionary.json                  # generated dictionary data used by the app
    find-words.ts                    # trie-based board word search and tile coverage check
    find-words.test.ts               # tests for board word search/tile coverage
    getTrie.ts                       # trie construction helper
    trie.ts                          # trie implementation
    wordblitz.ts                     # Word Blitz scoring, bonuses, routes, and board generation helpers
    wordblitz.test.ts                # tests for Word Blitz rules/helpers
  login/
    page.tsx                         # login page
  random-board/
    page.tsx                         # random board route shell
    random-board-client.tsx          # Word Blitz Practice Lab UI and round state
  ui/
    button.tsx                       # shared button
    colors.css                       # color variables
    globals.css                      # global styles and Word Blitz layout/tile styles
    input-board.tsx                  # board input UI
    input-tile.tsx                   # board input tile
    login-form.tsx                   # login form
    square-board.tsx                 # swipeable board component
    square-board.test.tsx            # board interaction tests
    theme-switch.tsx                 # light/dark theme switch
    tile.tsx                         # individual board tile
    tile.test.tsx                    # tile rendering tests
    top-bar.tsx                      # app top navigation
  layout.tsx                         # root app layout
  page.tsx                           # home page
  provider.tsx                       # shared boards/time context
public/
  CSW2015.txt                        # Collins Scrabble Words 2015 source list
  CSW2019.txt                        # Collins Scrabble Words 2019 source list
  Collins Scrabble Words (2019) with definitions.txt
                                      # source dictionary with definitions
```

## Word Blitz Practice Lab

The `/random-board` lab supports:

- Practice mode with no score and no multipliers.
- Normal scoring mode with R1/R2/R3 bonus layouts.
- Inspiration mode: every 5 manually found words grants one hint for a random 5+ word.
- 5+ bonus mode: +50 for every accepted word of length 5 or more.
- Blitz mode: 30-second timer, +1 second for every accepted word.
- 4+ words mode: only words of length 4 or more count.
- Quadruple bonus mode: R4 layout with 4W/4L support.
- Evolution mode: tiles level up to +5, +10, and +50.
- Custom arena modes:
  - Gladiator: only 5+ words count; valid shorter words add penalties.
  - Tight rope: only length-4 words count; other valid lengths add penalties.
  - 8+ superior: normal play, length-8+ words add kudos.
- Training mode for Q/X/Z/J boards. The selected rare letter is forced onto the board and receives a multiplier when applicable.
- Route preview from the word list. Clicking a word highlights a feasible route, preferring the highest-scoring route when multiple routes exist.
- Random board generation that keeps rerolling until every tile belongs to at least one valid/countable swipe route.
