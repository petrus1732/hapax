import { BonusOrNull, BOARD_SIZE } from './wordblitz';

export type PersistedBoardPayload = {
  boardName: string;
  size: number;
  letters: string;
  bonuses: BonusOrNull[];
  theme?: string | null;
  subtheme?: string | null;
  sourceMode?: string | null;
  abundance?: string | null;
  trainingSeedWord?: string | null;
};

const VALID_BONUSES = new Set(['dl', 'tl', 'ql', 'dw', 'tw', 'qw', null]);

export function normalizeBonuses(bonuses: unknown, expectedSize = BOARD_SIZE * BOARD_SIZE): BonusOrNull[] {
  if (!Array.isArray(bonuses)) return Array(expectedSize).fill(null);

  const normalized = bonuses.slice(0, expectedSize).map((bonus) => {
    if (bonus === null || bonus === undefined || bonus === '') return null;
    const value = String(bonus).toLowerCase();
    return VALID_BONUSES.has(value) ? (value as BonusOrNull) : null;
  });

  while (normalized.length < expectedSize) normalized.push(null);
  return normalized;
}

export function serializeBonuses(bonuses: BonusOrNull[]): string {
  return JSON.stringify(normalizeBonuses(bonuses, bonuses.length));
}

export function parseBonuses(value: unknown, expectedSize = BOARD_SIZE * BOARD_SIZE): BonusOrNull[] {
  if (Array.isArray(value)) return normalizeBonuses(value, expectedSize);
  if (typeof value !== 'string' || value.length === 0) return Array(expectedSize).fill(null);

  try {
    return normalizeBonuses(JSON.parse(value), expectedSize);
  } catch {
    return Array(expectedSize).fill(null);
  }
}

export function validatePersistedBoardPayload(payload: unknown): PersistedBoardPayload {
  if (!payload || typeof payload !== 'object') {
    throw new Error('Missing board payload.');
  }

  const record = payload as Record<string, unknown>;
  const size = Number(record.size ?? BOARD_SIZE);
  const letters = String(record.letters ?? '').toUpperCase();
  const boardName =
    String(record.boardName ?? '')
      .trim()
      .slice(0, 60) || 'Untitled board';

  if (!Number.isInteger(size) || size < 3 || size > 10) throw new Error('Invalid board size.');
  if (!/^[A-Z]+$/.test(letters) || letters.length !== size * size) throw new Error('Invalid letters.');

  return {
    boardName,
    size,
    letters,
    bonuses: normalizeBonuses(record.bonuses, size * size),
    theme: typeof record.theme === 'string' ? record.theme.slice(0, 60) : null,
    subtheme: typeof record.subtheme === 'string' ? record.subtheme.slice(0, 60) : null,
    sourceMode: typeof record.sourceMode === 'string' ? record.sourceMode.slice(0, 60) : null,
    abundance: typeof record.abundance === 'string' ? record.abundance.slice(0, 30) : null,
    trainingSeedWord:
      typeof record.trainingSeedWord === 'string' ? record.trainingSeedWord.toUpperCase().slice(0, 24) : null,
  };
}
