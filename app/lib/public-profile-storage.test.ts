import { describe, expect, it } from 'vitest';
import {
  normalizePlayerSearchTerm,
  normalizePublicPlayerId,
  publicPlayerDisplayName,
} from './public-profile-utils';

describe('public profile storage pure helpers', () => {
  it('normalizes player search terms without exposing unsafe length', () => {
    expect(normalizePlayerSearchTerm('  Chen   Ge  ')).toBe('Chen Ge');
    expect(normalizePlayerSearchTerm('x'.repeat(100))).toHaveLength(60);
  });

  it('normalizes public player ids', () => {
    expect(normalizePublicPlayerId('  abc-123  ')).toBe('abc-123');
    expect(normalizePublicPlayerId('x'.repeat(200))).toHaveLength(120);
  });

  it('uses a stable public display name fallback', () => {
    expect(publicPlayerDisplayName({ name: 'David', id: 'abcdef' })).toBe('David');
    expect(publicPlayerDisplayName({ name: '   ', id: 'abcdefghijk' })).toBe('Player abcdefgh');
    expect(publicPlayerDisplayName({})).toBe('Unknown player');
  });
});
