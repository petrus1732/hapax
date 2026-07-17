import { describe, expect, it } from 'vitest';
import {
  animateRoutePreview,
  boardMatchesTrainingSelection,
  canInspectSwipeResult,
  normalizeStoredBoard,
  trainingHasTimer,
} from './training-mode';

describe('training mode helpers', () => {
  it('treats timed and untimed training as one mode with different timer behavior', () => {
    expect(trainingHasTimer('timed')).toBe(true);
    expect(trainingHasTimer('untimed')).toBe(false);
    expect(canInspectSwipeResult('training', 'untimed')).toBe(true);
    expect(canInspectSwipeResult('training', 'timed')).toBe(false);
    expect(canInspectSwipeResult('normal', 'untimed')).toBe(false);
  });

  it('normalizes database and generated board shapes to the same camel-case format', () => {
    const board = normalizeStoredBoard({
      id: 7,
      author: 'Peter',
      boardName: 'Q board',
      size: 4,
      letters: 'abcdefghijklmnop',
      date: '2026-07-17',
      bonuses: '["dw",null]',
      source_mode: 'training',
      abundance: 'rich',
      training_seed_word: 'qat',
    });

    expect(board).toMatchObject({
      id: '7',
      boardName: 'Q board',
      letters: 'ABCDEFGHIJKLMNOP',
      sourceMode: 'training',
      abundance: 'rich',
      trainingSeedWord: 'QAT',
    });
    expect(board.bonuses).toHaveLength(16);
    expect(board.bonuses[0]).toBe('dw');
  });

  it('animates a route for exactly one second and clears it afterward', async () => {
    const frames: number[][] = [];
    const delays: number[] = [];

    await animateRoutePreview(
      [0, 1, 5],
      (frame) => frames.push(frame),
      async (milliseconds) => {
        delays.push(milliseconds);
      },
    );

    expect(frames).toEqual([[0], [0, 1], [0, 1, 5], []]);
    expect(delays.reduce((total, delay) => total + delay, 0)).toBe(1000);
  });

  it('filters saved boards by 4x4 shape, target letter, and known abundance', () => {
    const matching = normalizeStoredBoard({
      id: 'q',
      author: 'Lab',
      boardName: 'Q rich',
      size: 4,
      letters: 'QBCDEFGHIJKLMNOP',
      date: '',
      abundance: 'rich',
    });
    const unknownAbundance = normalizeStoredBoard({
      id: 'legacy',
      author: 'Lab',
      boardName: 'Legacy Q',
      size: 4,
      letters: 'QBCDEFGHIJKLMNOP',
      date: '',
    });

    expect(boardMatchesTrainingSelection(matching, 'Q', 'rich')).toBe(true);
    expect(boardMatchesTrainingSelection(matching, 'Q', 'normal')).toBe(false);
    expect(boardMatchesTrainingSelection(matching, 'X', 'rich')).toBe(false);
    expect(boardMatchesTrainingSelection(unknownAbundance, 'Q', 'very-rich')).toBe(true);
  });
});
