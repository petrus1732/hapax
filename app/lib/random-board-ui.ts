import type { PracticeMode } from './wordblitz';

export type WordListFilter = 'all' | 'found' | 'missed';
export type ArenaMetric = 'penalty' | 'kudo' | null;

export function filterWordGroupsByStatus(
  groups: string[][],
  slidWords: Record<string, unknown>,
  filter: WordListFilter,
): string[][] {
  if (filter === 'all') return groups;

  return groups.map((group) =>
    (group ?? []).filter((word) => (filter === 'found' ? Boolean(slidWords[word]) : !slidWords[word])),
  );
}

export function arenaMetricForWord(mode: PracticeMode, wordLength: number): ArenaMetric {
  if (mode === 'arena-gladiator' && wordLength <= 4) return 'penalty';
  if (mode === 'arena-tight-rope' && wordLength !== 4) return 'penalty';
  if (mode === 'arena-8-plus-superior' && wordLength >= 8) return 'kudo';
  return null;
}

export function registerFirstSwipe(seenWords: Set<string>, word: string): boolean {
  if (seenWords.has(word)) return false;
  seenWords.add(word);
  return true;
}
