import { sql } from '@vercel/postgres';
import { ensureUsersTable } from '@/app/lib/auth';
import { ensureProfileTables } from './profile-storage';
import { normalizePlayerSearchTerm, normalizePublicPlayerId } from './public-profile-utils';

export type PublicPlayer = {
  id: string;
  name: string | null;
  played_boards: number;
  dictionary_words: number;
  completed_timed_rounds: number;
  latest_activity: string | null;
};

export type PublicPlayerIdentity = {
  id: string;
  name: string | null;
  userKey: string;
};

export async function searchPublicPlayers(query: string, limit = 30) {
  await ensureUsersTable();
  await ensureProfileTables();

  const normalized = normalizePlayerSearchTerm(query);
  const like = `%${normalized.toLowerCase()}%`;
  const cappedLimit = Math.max(1, Math.min(50, Math.floor(limit)));

  const result = await sql<PublicPlayer>`
    WITH play_counts AS (
      SELECT
        user_email,
        COUNT(*)::int AS played_boards,
        COUNT(*) FILTER (
          WHERE completed = TRUE
            AND timed = TRUE
            AND personal_best_eligible = TRUE
            AND source_mode NOT IN ('practice', 'training', 'infinite')
        )::int AS completed_timed_rounds,
        MAX(updated_at) AS latest_activity
      FROM user_board_plays
      GROUP BY user_email
    ),
    word_counts AS (
      SELECT user_email, COUNT(*)::int AS dictionary_words
      FROM user_word_records
      GROUP BY user_email
    )
    SELECT
      u.id,
      u.name,
      COALESCE(play_counts.played_boards, 0)::int AS played_boards,
      COALESCE(word_counts.dictionary_words, 0)::int AS dictionary_words,
      COALESCE(play_counts.completed_timed_rounds, 0)::int AS completed_timed_rounds,
      play_counts.latest_activity
    FROM users u
    LEFT JOIN play_counts ON play_counts.user_email = u.email
    LEFT JOIN word_counts ON word_counts.user_email = u.email
    WHERE (${normalized.length === 0} OR lower(u.name) LIKE ${like} OR lower(u.email) LIKE ${like})
    ORDER BY
      CASE WHEN lower(u.name) = lower(${normalized}) THEN 0 ELSE 1 END,
      play_counts.latest_activity DESC NULLS LAST,
      u.name ASC
    LIMIT ${cappedLimit}
  `;

  return result.rows;
}

export async function getPublicPlayerIdentity(playerId: string): Promise<PublicPlayerIdentity | null> {
  await ensureUsersTable();
  const normalizedId = normalizePublicPlayerId(playerId);
  if (!normalizedId) return null;

  const result = await sql<{ id: string; name: string | null; email: string | null }>`
    SELECT id, name, email
    FROM users
    WHERE id = ${normalizedId}
    LIMIT 1
  `;

  const row = result.rows[0];
  if (!row?.email) return null;

  return {
    id: row.id,
    name: row.name,
    userKey: row.email,
  };
}
