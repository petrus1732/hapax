import { describe, expect, it } from 'vitest';
import {
  coverageFor,
  currentUserKey,
  isPersonalBestEligibleRandomRoll,
  normalizeFoundWords,
  roundRecordToSqlFields,
  sessionUserEmail,
  sessionUserName,
  validateRoundRecordPayload,
} from './profile-storage';

describe('profile storage pure helpers', () => {
  it('extracts a stable user key from either email or display name', () => {
    const session = { user: { name: 'David', email: 'david@local.hapax' } };
    expect(sessionUserName(session)).toBe('David');
    expect(sessionUserEmail(session)).toBe('david@local.hapax');
    expect(currentUserKey(session)).toBe('david@local.hapax');
    expect(currentUserKey({ user: { name: 'LocalOnly' } })).toBe('LocalOnly');
    expect(currentUserKey(null)).toBeNull();
  });

  it('deduplicates and sanitizes found words while preserving legal route indices', () => {
    const words = normalizeFoundWords([
      { word: ' ab ', path: [0, 1, 99, -1], score: 3 },
      { word: 'AB', path: [1, 2], score: 99 },
      { word: 'bad-word' },
      { word: 'care', inspired: true },
    ]);

    expect(words).toEqual([
      { word: 'AB', path: [0, 1], score: 3, inspired: false },
      { word: 'CARE', path: undefined, score: 0, inspired: true },
    ]);
  });

  it('normalizes round payloads used by auto-saved boards and personal records', () => {
    const payload = validateRoundRecordPayload({
      boardName: ' PB run ',
      size: 4,
      letters: 'abcdefghijklmnop',
      bonuses: ['dl', 'bad', 'tw'],
      sourceMode: 'blitz',
      totalWords: 200.7,
      foundWords: [{ word: 'AB', path: [0, 1] }],
      completed: true,
      personalBestEligible: true,
      trainingSeedWord: 'qorma',
    });

    expect(payload.boardName).toBe('PB run');
    expect(payload.letters).toBe('ABCDEFGHIJKLMNOP');
    expect(payload.totalWords).toBe(200);
    expect(payload.foundCount).toBe(1);
    expect(payload.bonuses.slice(0, 3)).toEqual(['dl', null, 'tw']);
    expect(payload.trainingSeedWord).toBe('QORMA');
  });

  it('computes rounded coverage percentages safely', () => {
    expect(coverageFor(57, 90)).toBe(63.33);
    expect(coverageFor(1, 3)).toBe(33.33);
    expect(coverageFor(5, 0)).toBe(0);
  });

  it('only lets completed timed random rolls count toward personal best fields', () => {
    const blitzPayload = validateRoundRecordPayload({
      boardName: 'Timed random',
      size: 4,
      letters: 'ABCDEFGHIJKLMNOP',
      sourceMode: 'blitz',
      totalWords: 120,
      foundCount: 60,
      personalBestEligible: true,
    });
    const replayPayload = validateRoundRecordPayload({
      boardName: 'Replay board',
      size: 4,
      letters: 'ABCDEFGHIJKLMNOP',
      sourceMode: 'blitz',
      totalWords: 120,
      foundCount: 60,
      personalBestEligible: false,
    });
    const infinitePayload = validateRoundRecordPayload({
      boardName: 'Untimed',
      size: 4,
      letters: 'ABCDEFGHIJKLMNOP',
      sourceMode: 'infinite',
      totalWords: 120,
      foundCount: 60,
      personalBestEligible: true,
    });

    expect(isPersonalBestEligibleRandomRoll(blitzPayload)).toBe(true);
    expect(roundRecordToSqlFields(blitzPayload).timed).toBe(true);
    expect(roundRecordToSqlFields(blitzPayload).personalBestEligible).toBe(true);
    expect(isPersonalBestEligibleRandomRoll(replayPayload)).toBe(false);
    expect(roundRecordToSqlFields(replayPayload).personalBestEligible).toBe(false);
    expect(roundRecordToSqlFields(infinitePayload).timed).toBe(false);
    expect(roundRecordToSqlFields(infinitePayload).personalBestEligible).toBe(false);
  });
});
