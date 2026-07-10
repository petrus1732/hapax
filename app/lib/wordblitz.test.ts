import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  BLITZ_SECONDS,
  BOARD_SIZE,
  MAX_BOARD_ROLL_ATTEMPTS,
  MIN_PLAYABLE_WORDS,
  ROUND_BONUS_SPECS,
  ROUND_SECONDS,
  TRAINING_LETTERS,
  VERY_RICH_FALLBACK_BOARDS,
  WORD_RICH_FALLBACK_BOARD,
  bestRouteForWord,
  boardAbundanceDistance,
  boardAbundanceLabel,
  bonusLabel,
  calculatePathScore,
  calculateInspirationChargeState,
  classifyBoardAbundance,
  countBonuses,
  fallbackBoardForMode,
  filterCountableWordsForMode,
  findRoutesForWord,
  formatRoute,
  generateBoardWithWord,
  generateBonuses,
  generateTrainingBoard,
  groupWordsByLength,
  isAdjacent,
  wordCountMatchesAbundance,
  lengthPoints,
  letterMultiplier,
  letterPoints,
  wordMultiplier,
  type Bonus,
  type BonusOrNull,
  type RoundMode,
} from './wordblitz';

afterEach(() => {
  vi.restoreAllMocks();
});

function nonNull<T>(values: Array<T | null | undefined>): T[] {
  return values.filter((value): value is T => value !== null && value !== undefined);
}

describe('Word Blitz constants and base helpers', () => {
  it('keeps the board and timer constants aligned with the practice specification', () => {
    expect(BOARD_SIZE).toBe(4);
    expect(ROUND_SECONDS).toBe(80);
    expect(BLITZ_SECONDS).toBe(30);
    expect(TRAINING_LETTERS).toEqual(['Q', 'X', 'Z', 'J']);
    expect(MIN_PLAYABLE_WORDS).toBe(90);
    expect(MAX_BOARD_ROLL_ATTEMPTS).toBeGreaterThanOrEqual(100);
  });

  it('uses the English Word Blitz/Scrabble-like point table and a safe fallback', () => {
    expect(letterPoints('A')).toBe(1);
    expect(letterPoints('q')).toBe(10);
    expect(letterPoints('X')).toBe(8);
    expect(letterPoints('?')).toBe(1);
  });

  it('matches the reverse-engineered length bonus formula round(length^1.35)', () => {
    expect([2, 3, 4, 5, 6, 7, 8, 9, 10].map(lengthPoints)).toEqual([3, 4, 6, 9, 11, 14, 17, 19, 22]);
  });

  it.each<[BonusOrNull, string]>([
    ['dl', '2L'],
    ['tl', '3L'],
    ['ql', '4L'],
    ['dw', '2W'],
    ['tw', '3W'],
    ['qw', '4W'],
    [null, ''],
  ])('renders bonus label %s as %s', (bonus, label) => {
    expect(bonusLabel(bonus)).toBe(label);
  });

  it('separates letter multipliers from word multipliers', () => {
    expect(letterMultiplier('dl')).toBe(2);
    expect(letterMultiplier('tl')).toBe(3);
    expect(letterMultiplier('ql')).toBe(4);
    expect(letterMultiplier('dw')).toBe(1);
    expect(wordMultiplier('dw')).toBe(2);
    expect(wordMultiplier('tw')).toBe(3);
    expect(wordMultiplier('qw')).toBe(4);
    expect(wordMultiplier('tl')).toBe(1);
  });

  it('calculates inspiration availability as floor((manual words - 5 * used hints) / 5) with charge remainder', () => {
    expect(calculateInspirationChargeState(0, 0)).toEqual({
      availableHints: 0,
      currentCharge: 0,
      threshold: 5,
      progressRatio: 0,
    });
    expect(calculateInspirationChargeState(4, 0)).toEqual({
      availableHints: 0,
      currentCharge: 4,
      threshold: 5,
      progressRatio: 0.8,
    });
    expect(calculateInspirationChargeState(12, 0)).toEqual({
      availableHints: 2,
      currentCharge: 2,
      threshold: 5,
      progressRatio: 0.4,
    });
    expect(calculateInspirationChargeState(12, 1)).toEqual({
      availableHints: 1,
      currentCharge: 2,
      threshold: 5,
      progressRatio: 0.4,
    });
    expect(calculateInspirationChargeState(12, 2)).toEqual({
      availableHints: 0,
      currentCharge: 2,
      threshold: 5,
      progressRatio: 0.4,
    });
  });

  it('filters countable words according to event and arena rules', () => {
    const sample = ['A', 'TO', 'CAT', 'CART', 'CARES', 'READING'];

    expect(filterCountableWordsForMode(sample, 'normal')).toEqual(['TO', 'CAT', 'CART', 'CARES', 'READING']);
    expect(filterCountableWordsForMode(sample, 'long-words-only-4-plus')).toEqual([
      'CART',
      'CARES',
      'READING',
    ]);
    expect(filterCountableWordsForMode(sample, 'arena-gladiator')).toEqual(['CARES', 'READING']);
    expect(filterCountableWordsForMode(sample, 'arena-tight-rope')).toEqual(['CART']);
  });

  it('provides word-rich fallback boards, including rare-letter training variants', () => {
    expect(fallbackBoardForMode('normal')).toHaveLength(16);
    expect(fallbackBoardForMode('training', 'Q')).toContain('Q');
    expect(fallbackBoardForMode('training', 'J')).toContain('J');
  });
});


describe('board abundance helpers', () => {
  it('classifies board word counts at the requested poor/normal/rich/very-rich boundaries', () => {
    expect(classifyBoardAbundance(150)).toBe('poor');
    expect(classifyBoardAbundance(151)).toBe('normal');
    expect(classifyBoardAbundance(250)).toBe('normal');
    expect(classifyBoardAbundance(251)).toBe('rich');
    expect(classifyBoardAbundance(400)).toBe('rich');
    expect(classifyBoardAbundance(401)).toBe('very-rich');
  });

  it('checks board abundance matches and reports distance to the requested bucket', () => {
    expect(boardAbundanceLabel('very-rich')).toBe('Very Rich');
    expect(wordCountMatchesAbundance(401, 'very-rich')).toBe(true);
    expect(wordCountMatchesAbundance(400, 'very-rich')).toBe(false);
    expect(boardAbundanceDistance(400, 'very-rich')).toBe(1);
    expect(boardAbundanceDistance(275, 'rich')).toBe(0);
    expect(boardAbundanceDistance(150, 'normal')).toBe(1);
  });

  it('uses a dedicated very-rich fallback instead of silently downgrading to the rich fallback board', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    expect(fallbackBoardForMode('normal', 'Q', 'very-rich')).toBe(VERY_RICH_FALLBACK_BOARDS[0]);
    expect(fallbackBoardForMode('normal', 'Q', 'very-rich')).not.toBe(WORD_RICH_FALLBACK_BOARD);
  });
});

describe('calculatePathScore', () => {
  it('scores a plain word as raw letter sum plus the length bonus', () => {
    // CAT = C(3) + A(1) + T(1) + round(3^1.35)(4)
    expect(calculatePathScore('CATXXXXXXXXXXXXX', [0, 1, 2])).toBe(9);
  });

  it('applies 2L/3L/4L to the owning tile before summing letters', () => {
    const bonuses: BonusOrNull[] = ['dl', 'tl', 'ql'];
    // C*2 + A*3 + T*4 + len(3) = 6 + 3 + 4 + 4
    expect(calculatePathScore('CATXXXXXXXXXXXXX', [0, 1, 2], bonuses)).toBe(17);
  });

  it('multiplies all word multipliers together', () => {
    const bonuses: BonusOrNull[] = ['dw', 'tw', 'qw'];
    // (C + A + T) * 2 * 3 * 4 + len(3) = 5*24 + 4
    expect(calculatePathScore('CATXXXXXXXXXXXXX', [0, 1, 2], bonuses)).toBe(124);
  });

  it('does not multiply the length bonus by word multipliers', () => {
    const bonuses: BonusOrNull[] = ['dw', 'tw', null, null, 'qw'];
    // CARES = 3+1+1+1+1 = 7; 2W*3W*4W = 24; length 5 bonus = 9.
    // Correct: 7*24 + 9 = 177. Incorrect whole-word multiplication would be (7+9)*24 = 384.
    expect(calculatePathScore('CARESXXXXXXXXXXX', [0, 1, 2, 3, 4], bonuses)).toBe(177);
  });

  it('adds exactly 50 for the 5+ bonus event and only for words of length at least five', () => {
    expect(calculatePathScore('CATSXXXXXXXXXXXX', [0, 1, 2, 3], [], { lengthBonus5Plus: true })).toBe(
      calculatePathScore('CATSXXXXXXXXXXXX', [0, 1, 2, 3]),
    );
    expect(calculatePathScore('CARESXXXXXXXXXXX', [0, 1, 2, 3, 4], [], { lengthBonus5Plus: true })).toBe(
      calculatePathScore('CARESXXXXXXXXXXX', [0, 1, 2, 3, 4]) + 50,
    );
  });

  it('turns scoring off completely in practice mode', () => {
    const bonuses: BonusOrNull[] = ['qw', 'ql', 'tw', 'tl', 'dw'];
    expect(calculatePathScore('CARESXXXXXXXXXXX', [0, 1, 2, 3, 4], bonuses, { practice: true })).toBe(0);
  });
});

describe('grid adjacency and route search', () => {
  it('recognizes orthogonal and diagonal neighbors but not itself, wraparounds, or distant tiles', () => {
    expect(isAdjacent(0, 1)).toBe(true);
    expect(isAdjacent(0, 4)).toBe(true);
    expect(isAdjacent(0, 5)).toBe(true);
    expect(isAdjacent(0, 0)).toBe(false);
    expect(isAdjacent(0, 3)).toBe(false);
    expect(isAdjacent(3, 4)).toBe(false);
    expect(isAdjacent(0, 10)).toBe(false);
  });

  it('finds feasible paths in a 4x4 board', () => {
    const routes = findRoutesForWord(4, 'CATXXXXXXXXXXXXX', 'CAT');
    expect(routes).toContainEqual([0, 1, 2]);
  });

  it('does not reuse the same tile inside one route', () => {
    expect(findRoutesForWord(4, 'ABXXXXXXXXXXXXXX', 'ABA')).toEqual([]);
  });

  it('is case-insensitive for the target word when searching routes', () => {
    expect(findRoutesForWord(4, 'CATXXXXXXXXXXXXX', 'cat')).toContainEqual([0, 1, 2]);
  });

  it('chooses a highest-scoring feasible route for word-list display', () => {
    const letters = 'CATXCATXXXXXXXXX';
    const bonuses: BonusOrNull[] = Array(16).fill(null);
    bonuses[4] = 'tw';

    const best = bestRouteForWord(4, letters, 'CAT', bonuses);

    expect(best).not.toBeNull();
    expect(best?.path).toContain(4);
    expect(best?.score).toBeGreaterThan(calculatePathScore(letters, [0, 1, 2], bonuses));
  });

  it('returns null when no feasible route exists', () => {
    expect(bestRouteForWord(4, 'CATXXXXXXXXXXXXX', 'DOG')).toBeNull();
  });
});

describe('round bonus generation', () => {
  const expectedRoundCounts: Record<RoundMode, Partial<Record<Bonus, number>>> = {
    practice: {},
    r1: { tl: 1, dl: 2 },
    r2: { dw: 2, dl: 1, tl: 1 },
    r3: { tw: 1, dw: 2, tl: 2, dl: 2 },
    r4: { qw: 1, tw: 1, dw: 2, ql: 1, tl: 2, dl: 2 },
  };

  it.each(Object.keys(ROUND_BONUS_SPECS) as RoundMode[])('has the expected spec for %s', (round) => {
    const generated = generateBonuses(round, 'ABCDEFGHIJKLMNOP');
    const actualCounts = nonNull(generated).reduce<Record<string, number>>((counts, bonus) => {
      counts[bonus] = (counts[bonus] ?? 0) + 1;
      return counts;
    }, {});

    expect(actualCounts).toEqual(expectedRoundCounts[round]);
  });

  it('never assigns two bonuses to one tile and never exceeds the 16 tile board', () => {
    for (let trial = 0; trial < 100; trial += 1) {
      for (const round of Object.keys(ROUND_BONUS_SPECS) as RoundMode[]) {
        const bonuses = generateBonuses(round, 'ABCDEFGHIJKLMNOP');
        expect(bonuses).toHaveLength(16);
        expect(nonNull(bonuses)).toHaveLength(ROUND_BONUS_SPECS[round].length);
      }
    }
  });

  it('counts display labels in the same buckets used by the UI', () => {
    expect(countBonuses(['dl', 'tl', 'ql', 'dw', 'tw', 'qw', null, 'dw'])).toEqual({
      '2L': 1,
      '3L': 1,
      '4L': 1,
      '2W': 2,
      '3W': 1,
      '4W': 1,
    });
  });

  it('forces a training target letter to receive a word multiplier when that round has one', () => {
    const bonuses = generateBonuses('r2', 'QAAAAAAAAAAAAAAA', 'Q');
    expect(bonuses[0]).toBe('dw');
  });

  it('falls back to a letter multiplier for the training target in R1, which has no word multiplier', () => {
    const bonuses = generateBonuses('r1', 'QAAAAAAAAAAAAAAA', 'Q');
    expect(bonuses[0]).toBe('tl');
  });
});

describe('board generation helpers', () => {
  it('can embed a requested word as a feasible route', () => {
    const board = generateBoardWithWord('CARES');
    expect(board).toHaveLength(16);
    expect(findRoutesForWord(4, board, 'CARES').length).toBeGreaterThan(0);
  });

  it('keeps a requested rare training letter on fallback boards even with no word candidates', () => {
    const board = generateTrainingBoard(['APPLE', 'BERRY', 'MANGO'], 'Q');
    expect(board).toHaveLength(16);
    expect(board).toContain('Q');
  });

  it('uses candidate words containing the requested rare letter when available', () => {
    const board = generateTrainingBoard(['JAZZES'], 'J');
    expect(board).toHaveLength(16);
    expect(board).toContain('J');
    expect(findRoutesForWord(4, board, 'JAZZES').length).toBeGreaterThan(0);
  });

  it('groups words by length and sorts each visible group alphabetically', () => {
    const grouped = groupWordsByLength(['TO', 'TEA', 'AID', 'ATOM', 'AT']);
    expect(grouped[2]).toEqual(['AT', 'TO']);
    expect(grouped[3]).toEqual(['AID', 'TEA']);
    expect(grouped[4]).toEqual(['ATOM']);
  });

  it('formats route indices as human-readable row-column coordinates', () => {
    expect(formatRoute([0, 5, 10, 15])).toBe('1-1 → 2-2 → 3-3 → 4-4');
  });
});
