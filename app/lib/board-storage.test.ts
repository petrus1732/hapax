import { describe, expect, it } from 'vitest';
import {
  normalizeBonuses,
  parseBonuses,
  serializeBonuses,
  validatePersistedBoardPayload,
} from './board-storage';

describe('board storage helpers', () => {
  it('normalizes bonus arrays to the requested board size and drops invalid tokens', () => {
    expect(normalizeBonuses(['dl', 'TW', 'bad', '', undefined], 6)).toEqual([
      'dl',
      'tw',
      null,
      null,
      null,
      null,
    ]);
  });

  it('round-trips serialized bonuses without changing legal bonus positions', () => {
    const bonuses = ['dl', null, 'qw', 'tl'] as const;
    expect(parseBonuses(serializeBonuses([...bonuses]), 4)).toEqual(['dl', null, 'qw', 'tl']);
  });

  it('uses safe defaults when a persisted board has optional metadata omitted', () => {
    const payload = validatePersistedBoardPayload({
      boardName: '  ',
      size: 4,
      letters: 'abcdefghijklmnop',
      bonuses: ['dw'],
    });

    expect(payload.boardName).toBe('Untitled board');
    expect(payload.letters).toBe('ABCDEFGHIJKLMNOP');
    expect(payload.bonuses).toHaveLength(16);
    expect(payload.bonuses[0]).toBe('dw');
    expect(payload.bonuses.slice(1).every((bonus) => bonus === null)).toBe(true);
  });

  it('rejects malformed persisted boards before they can be saved or submitted', () => {
    expect(() => validatePersistedBoardPayload({ size: 4, letters: 'ABC', boardName: 'short' })).toThrow(
      'Invalid letters.',
    );
    expect(() => validatePersistedBoardPayload({ size: 2, letters: 'ABCD', boardName: 'small' })).toThrow(
      'Invalid board size.',
    );
  });
});
