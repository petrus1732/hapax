import { sql } from '@vercel/postgres';
import { auth } from '@/app/lib/auth';
import { BOARD_SIZE, BonusOrNull, PracticeMode } from './wordblitz';
import { normalizeBonuses, serializeBonuses } from './board-storage';

export type AuthSession = Awaited<ReturnType<typeof auth>>;

type SessionUserLike = {
  name?: string | null;
  email?: string | null;
};

export function sessionUser(session: unknown): SessionUserLike | null {
  if (!session || typeof session !== 'object') return null;
  const user = (session as { user?: unknown }).user;
  if (!user || typeof user !== 'object') return null;
  return user as SessionUserLike;
}

export function sessionUserName(session: unknown) {
  return sessionUser(session)?.name ?? null;
}

export function sessionUserEmail(session: unknown) {
  return sessionUser(session)?.email ?? null;
}

export type FoundWordRecord = {
  word: string;
  path?: number[];
  score?: number;
  inspired?: boolean;
};

export type RoundRecordPayload = {
  id?: string | null;
  boardName: string;
  size: number;
  letters: string;
  bonuses: BonusOrNull[];
  sourceMode: PracticeMode | string;
  roundMode?: string | null;
  abundance?: string | null;
  trainingSeedWord?: string | null;
  totalWords?: number;
  countableWords?: number;
  foundWords?: FoundWordRecord[];
  foundCount?: number;
  score?: number;
  completed?: boolean;
  theme?: string | null;
  subtheme?: string | null;
};

export function currentUserKey(session: unknown) {
  const user = sessionUser(session);
  return user?.email ?? user?.name ?? null;
}

export function normalizeFoundWords(value: unknown): FoundWordRecord[] {
  if (!Array.isArray(value)) return [];

  const seen = new Set<string>();
  const normalized: FoundWordRecord[] = [];

  for (const item of value) {
    if (!item || typeof item !== 'object') continue;
    const record = item as Record<string, unknown>;
    const word = String(record.word ?? '')
      .trim()
      .toUpperCase();
    if (!/^[A-Z]{2,24}$/.test(word) || seen.has(word)) continue;
    seen.add(word);

    const path = Array.isArray(record.path)
      ? record.path
          .map((part) => Number(part))
          .filter((part) => Number.isInteger(part) && part >= 0 && part < BOARD_SIZE * BOARD_SIZE)
      : undefined;

    normalized.push({
      word,
      path,
      score: Number.isFinite(Number(record.score)) ? Number(record.score) : 0,
      inspired: Boolean(record.inspired),
    });
  }

  return normalized;
}

export function validateRoundRecordPayload(payload: unknown): RoundRecordPayload {
  if (!payload || typeof payload !== 'object') throw new Error('Missing round payload.');

  const record = payload as Record<string, unknown>;
  const size = Number(record.size ?? BOARD_SIZE);
  const letters = String(record.letters ?? '')
    .trim()
    .toUpperCase();
  const foundWords = normalizeFoundWords(record.foundWords);
  const totalWords = Math.max(0, Math.floor(Number(record.totalWords ?? 0)));
  const countableWords = Math.max(0, Math.floor(Number(record.countableWords ?? totalWords)));
  const foundCount = Math.max(0, Math.floor(Number(record.foundCount ?? foundWords.length)));
  const score = Math.max(0, Math.floor(Number(record.score ?? 0)));

  if (!Number.isInteger(size) || size < 3 || size > 10) throw new Error('Invalid board size.');
  if (!/^[A-Z]+$/.test(letters) || letters.length !== size * size) throw new Error('Invalid letters.');

  return {
    id: typeof record.id === 'string' && record.id.length > 0 ? record.id.slice(0, 80) : null,
    boardName:
      String(record.boardName ?? '')
        .trim()
        .slice(0, 80) || 'Untitled play',
    size,
    letters,
    bonuses: normalizeBonuses(record.bonuses, size * size),
    sourceMode: String(record.sourceMode ?? 'practice').slice(0, 60),
    roundMode: typeof record.roundMode === 'string' ? record.roundMode.slice(0, 30) : null,
    abundance: typeof record.abundance === 'string' ? record.abundance.slice(0, 30) : null,
    trainingSeedWord:
      typeof record.trainingSeedWord === 'string' ? record.trainingSeedWord.toUpperCase().slice(0, 24) : null,
    totalWords,
    countableWords,
    foundWords,
    foundCount,
    score,
    completed: Boolean(record.completed),
    theme: typeof record.theme === 'string' ? record.theme.slice(0, 60) : null,
    subtheme: typeof record.subtheme === 'string' ? record.subtheme.slice(0, 60) : null,
  };
}

export function isTimedPersonalBestMode(sourceMode: string) {
  return !['practice', 'infinite', 'training'].includes(sourceMode);
}

export async function ensureProfileTables() {
  await sql`
    CREATE TABLE IF NOT EXISTS user_board_plays (
      id TEXT PRIMARY KEY,
      user_email TEXT NOT NULL,
      user_name TEXT,
      board_name TEXT NOT NULL,
      size INTEGER NOT NULL,
      letters TEXT NOT NULL,
      bonuses TEXT,
      theme TEXT,
      subtheme TEXT,
      source_mode TEXT NOT NULL,
      round_mode TEXT,
      abundance TEXT,
      training_seed_word TEXT,
      total_words INTEGER NOT NULL DEFAULT 0,
      countable_words INTEGER NOT NULL DEFAULT 0,
      found_count INTEGER NOT NULL DEFAULT 0,
      coverage DOUBLE PRECISION NOT NULL DEFAULT 0,
      score INTEGER NOT NULL DEFAULT 0,
      found_words TEXT,
      completed BOOLEAN NOT NULL DEFAULT FALSE,
      timed BOOLEAN NOT NULL DEFAULT FALSE,
      date TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS user_board_plays_user_email_idx ON user_board_plays (user_email)`;
  await sql`CREATE INDEX IF NOT EXISTS user_board_plays_user_updated_idx ON user_board_plays (user_email, updated_at DESC)`;

  await sql`
    CREATE TABLE IF NOT EXISTS user_word_records (
      user_email TEXT NOT NULL,
      user_name TEXT,
      word TEXT NOT NULL,
      first_seen TEXT NOT NULL,
      last_seen TEXT NOT NULL,
      times_found INTEGER NOT NULL DEFAULT 1,
      best_score INTEGER NOT NULL DEFAULT 0,
      PRIMARY KEY (user_email, word)
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS user_word_records_user_email_idx ON user_word_records (user_email)`;
  await sql`CREATE INDEX IF NOT EXISTS user_word_records_user_last_seen_idx ON user_word_records (user_email, last_seen DESC)`;
}

export async function upsertDictionaryWords(
  session: AuthSession,
  words: FoundWordRecord[],
  options: { includeInspired?: boolean; increment?: boolean } = {},
) {
  const userKey = currentUserKey(session);
  if (!userKey) return;

  const now = new Date().toISOString();
  const increment = options.increment ?? true;
  const unique = new Map<string, FoundWordRecord>();
  for (const item of words) {
    if (!options.includeInspired && item.inspired) continue;
    const word = item.word.trim().toUpperCase();
    if (!/^[A-Z]{2,24}$/.test(word)) continue;
    const previous = unique.get(word);
    if (!previous || (item.score ?? 0) > (previous.score ?? 0)) unique.set(word, { ...item, word });
  }

  for (const item of unique.values()) {
    await sql`
      INSERT INTO user_word_records (user_email, user_name, word, first_seen, last_seen, times_found, best_score)
      VALUES (${userKey}, ${sessionUserName(session)}, ${item.word}, ${now}, ${now}, 1, ${Math.max(0, Math.floor(item.score ?? 0))})
      ON CONFLICT (user_email, word)
      DO UPDATE SET
        user_name = EXCLUDED.user_name,
        last_seen = EXCLUDED.last_seen,
        times_found = CASE
          WHEN ${increment} THEN user_word_records.times_found + 1
          ELSE user_word_records.times_found
        END,
        best_score = GREATEST(user_word_records.best_score, EXCLUDED.best_score)
    `;
  }
}

export function coverageFor(foundCount: number, countableWords: number) {
  if (countableWords <= 0) return 0;
  return Math.round((foundCount / countableWords) * 10000) / 100;
}

export function roundRecordToSqlFields(payload: RoundRecordPayload) {
  const foundWords = normalizeFoundWords(payload.foundWords);
  const foundCount = payload.foundCount ?? foundWords.length;
  const countableWords = payload.countableWords ?? payload.totalWords ?? 0;
  const sourceMode = String(payload.sourceMode ?? 'practice');

  return {
    ...payload,
    foundWords,
    foundCount,
    countableWords,
    coverage: coverageFor(foundCount, countableWords),
    bonusesSerialized: serializeBonuses(payload.bonuses),
    foundWordsSerialized: JSON.stringify(foundWords),
    timed: isTimedPersonalBestMode(sourceMode),
  };
}
