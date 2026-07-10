import { describe, expect, it } from 'vitest';
import { arenaMetricForWord, filterWordGroupsByStatus, registerFirstSwipe } from './random-board-ui';

describe('word-list filtering', () => {
  const groups = [[], [], ['AT', 'TO'], ['ATE', 'TEA']];
  const slidWords = { AT: true, TEA: true };

  it('supports all, manually swiped, and missed word views', () => {
    expect(filterWordGroupsByStatus(groups, slidWords, 'all')).toBe(groups);
    expect(filterWordGroupsByStatus(groups, slidWords, 'found')).toEqual([[], [], ['AT'], ['TEA']]);
    expect(filterWordGroupsByStatus(groups, slidWords, 'missed')).toEqual([[], [], ['TO'], ['ATE']]);
  });
});

describe('custom arena metrics', () => {
  it('assigns penalties only to invalid lengths', () => {
    expect(arenaMetricForWord('arena-gladiator', 4)).toBe('penalty');
    expect(arenaMetricForWord('arena-gladiator', 5)).toBeNull();
    expect(arenaMetricForWord('arena-tight-rope', 3)).toBe('penalty');
    expect(arenaMetricForWord('arena-tight-rope', 4)).toBeNull();
    expect(arenaMetricForWord('arena-tight-rope', 5)).toBe('penalty');
  });

  it('assigns kudos only to length-8-plus words in 8+ superior', () => {
    expect(arenaMetricForWord('arena-8-plus-superior', 7)).toBeNull();
    expect(arenaMetricForWord('arena-8-plus-superior', 8)).toBe('kudo');
    expect(arenaMetricForWord('normal', 10)).toBeNull();
  });

  it('registers each dictionary word only on its first swipe', () => {
    const seen = new Set<string>();
    expect(registerFirstSwipe(seen, 'WORD')).toBe(true);
    expect(registerFirstSwipe(seen, 'WORD')).toBe(false);
    expect(registerFirstSwipe(seen, 'WORDS')).toBe(true);
  });
});
