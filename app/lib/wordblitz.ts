export type Bonus = 'dl' | 'tl' | 'ql' | 'dw' | 'tw' | 'qw';
export type BonusOrNull = Bonus | null;
export type RoundMode = 'practice' | 'r1' | 'r2' | 'r3' | 'r4';
export type PracticeMode =
  | 'practice'
  | 'normal'
  | 'inspiration'
  | 'length-bonus-5-plus'
  | 'blitz'
  | 'long-words-only-4-plus'
  | 'quadruple-bonus'
  | 'evolution'
  | 'arena-gladiator'
  | 'arena-tight-rope'
  | 'arena-8-plus-superior'
  | 'training';

export type RouteScore = {
  path: number[];
  score: number;
};

export type WordEntry = {
  word: string;
  bestPath: number[];
  score: number;
};

export const BOARD_SIZE = 4;
export const ROUND_SECONDS = 80;
export const BLITZ_SECONDS = 30;
export const MIN_PLAYABLE_WORDS = 90;
export const MAX_BOARD_ROLL_ATTEMPTS = 120;
export const WORD_RICH_FALLBACK_BOARD = 'MARMNEAYOSLAAZXE';
export const TRAINING_LETTERS = ['Q', 'X', 'Z', 'J'] as const;

export const INSPIRATION_CHARGE_THRESHOLD = 5;

export type InspirationChargeState = {
  availableHints: number;
  currentCharge: number;
  threshold: number;
  progressRatio: number;
};

export function calculateInspirationChargeState(
  manualAcceptedCount: number,
  hintsUsed: number,
  threshold = INSPIRATION_CHARGE_THRESHOLD,
): InspirationChargeState {
  const safeThreshold = Math.max(1, Math.floor(threshold));
  const remainingCharge = Math.max(0, manualAcceptedCount - safeThreshold * hintsUsed);
  const availableHints = Math.floor(remainingCharge / safeThreshold);
  const currentCharge = remainingCharge % safeThreshold;

  return {
    availableHints,
    currentCharge,
    threshold: safeThreshold,
    progressRatio: currentCharge / safeThreshold,
  };
}

export type TrainingLetter = (typeof TRAINING_LETTERS)[number];

export const TRAINING_WORD_RICH_FALLBACK_BOARDS: Record<TrainingLetter, string> = {
  Q: 'MARMNEAYOSLAQZXE',
  X: 'MARMNEAYOSLAAZXE',
  Z: 'MARMNEAYOSLAAZZE',
  J: 'MARMNEAYOSLAJZXE',
};

export const LETTER_POINTS: Record<string, number> = {
  A: 1,
  B: 3,
  C: 3,
  D: 2,
  E: 1,
  F: 4,
  G: 2,
  H: 4,
  I: 1,
  J: 8,
  K: 5,
  L: 1,
  M: 3,
  N: 1,
  O: 1,
  P: 3,
  Q: 10,
  R: 1,
  S: 1,
  T: 1,
  U: 1,
  V: 4,
  W: 4,
  X: 8,
  Y: 4,
  Z: 10,
};

const VOWELS = 'AEIOUY';
const CONSONANTS = 'BCDFGHJKLMNPQRSTVWXZ';

const LETTERS = Object.keys(LETTER_POINTS);
const LETTER_WEIGHTS = LETTERS.map((letter) => 1 / LETTER_POINTS[letter]);
const TOTAL_LETTER_WEIGHT = LETTER_WEIGHTS.reduce((sum, weight) => sum + weight, 0);

export const ROUND_BONUS_SPECS: Record<RoundMode, Bonus[]> = {
  practice: [],
  r1: ['tl', 'dl', 'dl'],
  r2: ['dw', 'dw', 'dl', 'tl'],
  r3: ['tw', 'dw', 'dw', 'tl', 'tl', 'dl', 'dl'],
  r4: ['qw', 'tw', 'dw', 'dw', 'ql', 'tl', 'tl', 'dl', 'dl'],
};

export function letterPoints(letter: string): number {
  return LETTER_POINTS[letter.toUpperCase()] ?? 1;
}

export function lengthPoints(length: number): number {
  return Math.round(length ** 1.35);
}

export function bonusLabel(bonus: BonusOrNull): string {
  switch (bonus) {
    case 'dl':
      return '2L';
    case 'tl':
      return '3L';
    case 'ql':
      return '4L';
    case 'dw':
      return '2W';
    case 'tw':
      return '3W';
    case 'qw':
      return '4W';
    default:
      return '';
  }
}

export function letterMultiplier(bonus: BonusOrNull): number {
  switch (bonus) {
    case 'dl':
      return 2;
    case 'tl':
      return 3;
    case 'ql':
      return 4;
    default:
      return 1;
  }
}

export function wordMultiplier(bonus: BonusOrNull): number {
  switch (bonus) {
    case 'dw':
      return 2;
    case 'tw':
      return 3;
    case 'qw':
      return 4;
    default:
      return 1;
  }
}

export function calculatePathScore(
  letters: string,
  path: number[],
  bonuses: BonusOrNull[] = [],
  options: { lengthBonus5Plus?: boolean; practice?: boolean } = {},
): number {
  if (options.practice) return 0;

  let letterScore = 0;
  let wordFactor = 1;

  for (const index of path) {
    const bonus = bonuses[index] ?? null;
    letterScore += letterPoints(letters[index]) * letterMultiplier(bonus);
    wordFactor *= wordMultiplier(bonus);
  }

  const modeBonus = options.lengthBonus5Plus && path.length >= 5 ? 50 : 0;
  return letterScore * wordFactor + lengthPoints(path.length) + modeBonus;
}

export function isAdjacent(indexA: number, indexB: number, size = BOARD_SIZE): boolean {
  const rowA = Math.floor(indexA / size);
  const colA = indexA % size;
  const rowB = Math.floor(indexB / size);
  const colB = indexB % size;
  return Math.abs(rowA - rowB) <= 1 && Math.abs(colA - colB) <= 1 && indexA !== indexB;
}

export function findRoutesForWord(size: number, letters: string, word: string): number[][] {
  const target = word.toUpperCase();
  const routes: number[][] = [];
  const total = size * size;

  function dfs(index: number, depth: number, path: number[], used: boolean[]) {
    if (letters[index] !== target[depth]) return;

    const nextPath = [...path, index];
    if (depth === target.length - 1) {
      routes.push(nextPath);
      return;
    }

    used[index] = true;
    for (let next = 0; next < total; next += 1) {
      if (!used[next] && isAdjacent(index, next, size) && letters[next] === target[depth + 1]) {
        dfs(next, depth + 1, nextPath, used);
      }
    }
    used[index] = false;
  }

  for (let index = 0; index < total; index += 1) {
    if (letters[index] === target[0]) {
      dfs(index, 0, [], Array(total).fill(false));
    }
  }

  return routes;
}

export function bestRouteForWord(
  size: number,
  letters: string,
  word: string,
  bonuses: BonusOrNull[] = [],
  options: { lengthBonus5Plus?: boolean; practice?: boolean } = {},
): RouteScore | null {
  const routes = findRoutesForWord(size, letters, word);
  if (routes.length === 0) return null;

  return routes
    .map((path) => ({
      path,
      score: calculatePathScore(letters, path, bonuses, options),
    }))
    .sort((a, b) => b.score - a.score)[0];
}

export function groupWordsByLength(words: string[]): string[][] {
  const grouped: string[][] = [];
  for (const word of words) {
    if (!grouped[word.length]) grouped[word.length] = [];
    grouped[word.length].push(word);
  }
  return grouped.map((group) => (group ? [...group].sort() : group));
}

export function randomBoardLetters(): string {
  let letters = '';
  for (let index = 0; index < BOARD_SIZE * BOARD_SIZE; index += 1) {
    letters +=
      Math.random() < 0.3
        ? VOWELS[Math.floor(Math.random() * VOWELS.length)]
        : CONSONANTS[Math.floor(Math.random() * CONSONANTS.length)];
  }
  return letters;
}

function weightedRandomLetter(): string {
  const roll = Math.random();
  let cumulative = 0;
  for (let index = 0; index < LETTERS.length; index += 1) {
    cumulative += LETTER_WEIGHTS[index] / TOTAL_LETTER_WEIGHT;
    if (roll < cumulative) return LETTERS[index];
  }
  return 'E';
}

function shuffle<T>(items: T[]): T[] {
  const next = [...items];
  for (let index = next.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [next[index], next[swapIndex]] = [next[swapIndex], next[index]];
  }
  return next;
}

export function generateBoardWithWord(word: string, targetLetter?: string): string {
  const size = BOARD_SIZE;
  const total = size * size;
  const normalizedWord = word.toUpperCase();
  const board: Array<string | null> = Array(total).fill(null);
  const directions = [
    [-1, -1],
    [-1, 0],
    [-1, 1],
    [0, -1],
    [0, 1],
    [1, -1],
    [1, 0],
    [1, 1],
  ];

  const indexOf = (x: number, y: number) => y * size + x;
  let path: Array<[number, number]> = [];

  for (let attempt = 0; attempt < 250; attempt += 1) {
    const visited = Array.from({ length: size }, () => Array(size).fill(false));
    path = [];

    function dfs(x: number, y: number, depth: number): boolean {
      visited[y][x] = true;
      path.push([x, y]);

      if (depth === normalizedWord.length - 1) return true;

      for (const [dx, dy] of shuffle(directions)) {
        const nx = x + dx;
        const ny = y + dy;
        if (nx >= 0 && nx < size && ny >= 0 && ny < size && !visited[ny][nx]) {
          if (dfs(nx, ny, depth + 1)) return true;
        }
      }

      visited[y][x] = false;
      path.pop();
      return false;
    }

    const startX = Math.floor(Math.random() * size);
    const startY = Math.floor(Math.random() * size);
    if (dfs(startX, startY, 0)) break;
  }

  if (path.length !== normalizedWord.length) return randomBoardLetters();

  path.forEach(([x, y], pathIndex) => {
    board[indexOf(x, y)] = normalizedWord[pathIndex];
  });

  const target = targetLetter?.toUpperCase();
  if (target && !board.includes(target)) {
    const emptyIndices = board
      .map((letter, index) => (letter === null ? index : -1))
      .filter((index) => index >= 0);
    const chosen = emptyIndices[Math.floor(Math.random() * emptyIndices.length)];
    if (chosen !== undefined) board[chosen] = target;
  }

  for (let index = 0; index < total; index += 1) {
    if (board[index] === 'Q') {
      const x = index % size;
      const y = Math.floor(index / size);
      const emptyNeighbors: number[] = [];
      let hasU = false;

      for (const [dx, dy] of directions) {
        const nx = x + dx;
        const ny = y + dy;
        if (nx >= 0 && nx < size && ny >= 0 && ny < size) {
          const nextIndex = indexOf(nx, ny);
          if (board[nextIndex] === 'U') hasU = true;
          if (board[nextIndex] === null) emptyNeighbors.push(nextIndex);
        }
      }

      if (!hasU && emptyNeighbors.length > 0) {
        board[emptyNeighbors[Math.floor(Math.random() * emptyNeighbors.length)]] = 'U';
      }
    }
  }

  for (let index = 0; index < total; index += 1) {
    if (board[index] === null) board[index] = weightedRandomLetter();
  }

  return board.join('');
}

export function generateTrainingBoard(wordlist: string[], letter: TrainingLetter): string {
  const candidates = wordlist
    .map((word) => word.toUpperCase())
    .filter((word) => word.length >= 5 && word.length <= 8 && word.includes(letter));

  if (candidates.length === 0) {
    const letters = randomBoardLetters().split('');
    letters[Math.floor(Math.random() * letters.length)] = letter;
    return letters.join('');
  }

  const baseWord = candidates[Math.floor(Math.random() * candidates.length)];
  return generateBoardWithWord(baseWord, letter);
}

export function generateBonuses(round: RoundMode, letters: string, trainingLetter?: string): BonusOrNull[] {
  const bonuses: BonusOrNull[] = Array(BOARD_SIZE * BOARD_SIZE).fill(null);
  const spec = [...ROUND_BONUS_SPECS[round]];
  if (spec.length === 0) return bonuses;

  const positions = Array.from({ length: BOARD_SIZE * BOARD_SIZE }, (_, index) => index);
  const targetPositions = trainingLetter
    ? positions.filter((index) => letters[index] === trainingLetter.toUpperCase())
    : [];

  if (targetPositions.length > 0) {
    const targetIndex = targetPositions[Math.floor(Math.random() * targetPositions.length)];
    const wordBonusIndex = spec.findIndex((bonus) => bonus === 'qw' || bonus === 'tw' || bonus === 'dw');
    const fallbackIndex = spec.findIndex((bonus) => bonus === 'ql' || bonus === 'tl' || bonus === 'dl');
    const chosenBonusIndex = wordBonusIndex >= 0 ? wordBonusIndex : fallbackIndex;

    if (chosenBonusIndex >= 0) {
      bonuses[targetIndex] = spec.splice(chosenBonusIndex, 1)[0];
      const targetPositionInPool = positions.indexOf(targetIndex);
      if (targetPositionInPool >= 0) positions.splice(targetPositionInPool, 1);
    }
  }

  const shuffledPositions = shuffle(positions);
  for (const bonus of shuffle(spec)) {
    const index = shuffledPositions.pop();
    if (index === undefined) break;
    bonuses[index] = bonus;
  }

  return bonuses;
}

export function countBonuses(
  bonuses: BonusOrNull[],
): Record<'2L' | '3L' | '4L' | '2W' | '3W' | '4W', number> {
  const counts = { '2L': 0, '3L': 0, '4L': 0, '2W': 0, '3W': 0, '4W': 0 };
  for (const bonus of bonuses) {
    const label = bonusLabel(bonus) as keyof typeof counts | '';
    if (label) counts[label] += 1;
  }
  return counts;
}

export function isWordCountableInMode(word: string, mode: PracticeMode): boolean {
  if (word.length < 2) return false;

  switch (mode) {
    case 'long-words-only-4-plus':
      return word.length >= 4;
    case 'arena-gladiator':
      return word.length >= 5;
    case 'arena-tight-rope':
      return word.length === 4;
    default:
      return true;
  }
}

export function filterCountableWordsForMode(words: string[], mode: PracticeMode): string[] {
  return words.filter((word) => isWordCountableInMode(word, mode));
}

export function fallbackBoardForMode(mode: PracticeMode, trainingLetter: TrainingLetter = 'Q'): string {
  return mode === 'training' ? TRAINING_WORD_RICH_FALLBACK_BOARDS[trainingLetter] : WORD_RICH_FALLBACK_BOARD;
}

export function formatRoute(path: number[]): string {
  return path.map((index) => `${Math.floor(index / BOARD_SIZE) + 1}-${(index % BOARD_SIZE) + 1}`).join(' → ');
}
