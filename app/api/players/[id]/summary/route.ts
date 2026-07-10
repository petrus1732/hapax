import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import dictionary from '@/app/lib/dictionary.json';
import { auth } from '@/app/lib/auth';
import { currentUserKey, ensureProfileTables } from '@/app/lib/profile-storage';
import { getPublicPlayerIdentity } from '@/app/lib/public-profile-storage';

type WordRow = {
  word: string;
  times_found: number;
  last_seen: string;
};

type Recommendation = {
  word: string;
  reason: string;
  score: number;
};

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const DICTIONARY_WORDS = Object.keys(dictionary as Record<string, string>).map((word) => word.toUpperCase());
const DICTIONARY_SET = new Set(DICTIONARY_WORDS);
const FALLBACK_HUNTS = ['ATE', 'EAT', 'TEA', 'ARE', 'EAR', 'ERA', 'RATE', 'TARE', 'TRAIN', 'TRAINER'];

function parseBoolean(value: string | null, fallback: boolean) {
  if (value === null) return fallback;
  return value === 'true' || value === '1' || value === 'yes';
}

function cleanWord(word: string) {
  return word.trim().toUpperCase();
}

function addRecommendation(
  map: Map<string, Recommendation>,
  word: string,
  reason: string,
  score: number,
  known: Set<string>,
) {
  const normalized = cleanWord(word);
  if (!/^[A-Z]{2,24}$/.test(normalized)) return;
  if (!DICTIONARY_SET.has(normalized) || known.has(normalized)) return;

  const previous = map.get(normalized);
  const boostedScore = score + (normalized.length >= 5 ? 4 : 0) + Math.min(normalized.length, 7);
  if (!previous || boostedScore > previous.score) {
    map.set(normalized, { word: normalized, reason, score: boostedScore });
  }
}

function buildHuntingRecommendations(rows: WordRow[]): Recommendation[] {
  const known = new Set(rows.map((row) => cleanWord(row.word)).filter(Boolean));
  const candidates = new Map<string, Recommendation>();
  const recentUsefulWords = rows
    .map((row) => cleanWord(row.word))
    .filter((word) => /^[A-Z]{2,10}$/.test(word))
    .slice(0, 500);

  for (const base of recentUsefulWords) {
    if (base.length < 2 || base.length > 9) continue;

    for (let index = 0; index <= base.length; index += 1) {
      for (const letter of ALPHABET) {
        addRecommendation(
          candidates,
          `${base.slice(0, index)}${letter}${base.slice(index)}`,
          `one-letter extension of ${base}`,
          8,
          known,
        );
      }
    }

    for (let index = 0; index < base.length; index += 1) {
      for (const letter of ALPHABET) {
        if (letter === base[index]) continue;
        addRecommendation(
          candidates,
          `${base.slice(0, index)}${letter}${base.slice(index + 1)}`,
          `one-letter swap near ${base}`,
          5,
          known,
        );
      }
    }

    if (base.length >= 4) {
      addRecommendation(candidates, base.slice(0, -1), `short form of ${base}`, 3, known);
      addRecommendation(candidates, base.slice(1), `short form of ${base}`, 3, known);
    }
  }

  if (candidates.size < 3) {
    for (const fallback of FALLBACK_HUNTS) {
      addRecommendation(candidates, fallback, 'high-utility starter word', 2, known);
    }
  }

  return [...candidates.values()]
    .sort((a, b) => b.score - a.score || a.word.length - b.word.length || a.word.localeCompare(b.word))
    .slice(0, 3);
}

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await auth();
    if (!currentUserKey(session)) {
      return NextResponse.json({ ok: false, error: 'Login required.' }, { status: 401 });
    }

    const player = await getPublicPlayerIdentity(params.id);
    if (!player) return NextResponse.json({ ok: false, error: 'Player not found.' }, { status: 404 });

    const includeInspiration = parseBoolean(request.nextUrl.searchParams.get('includeInspiration'), true);
    const includeBlitz = parseBoolean(request.nextUrl.searchParams.get('includeBlitz'), true);

    await ensureProfileTables();

    const playCount = await sql<{ count: string }>`
      SELECT COUNT(*)::text AS count
      FROM user_board_plays
      WHERE user_email = ${player.userKey}
    `;
    const completedTimedCount = await sql<{ count: string }>`
      SELECT COUNT(*)::text AS count
      FROM user_board_plays
      WHERE user_email = ${player.userKey}
        AND completed = TRUE
        AND timed = TRUE
        AND personal_best_eligible = TRUE
        AND source_mode NOT IN ('practice', 'training', 'infinite')
        AND (${includeInspiration} OR source_mode <> 'inspiration')
        AND (${includeBlitz} OR source_mode <> 'blitz')
    `;
    const dictionaryCount = await sql<{ count: string }>`
      SELECT COUNT(*)::text AS count
      FROM user_word_records
      WHERE user_email = ${player.userKey}
    `;
    const highestWordCount = await sql<{
      id: string;
      board_name: string;
      source_mode: string;
      found_count: number;
      coverage: number;
      score: number;
      updated_at: string;
    }>`
      SELECT id, board_name, source_mode, found_count, coverage, score, updated_at
      FROM user_board_plays
      WHERE user_email = ${player.userKey}
        AND completed = TRUE
        AND timed = TRUE
        AND personal_best_eligible = TRUE
        AND source_mode NOT IN ('practice', 'training', 'infinite')
        AND (${includeInspiration} OR source_mode <> 'inspiration')
        AND (${includeBlitz} OR source_mode <> 'blitz')
      ORDER BY found_count DESC, coverage DESC, score DESC, updated_at DESC
      LIMIT 1
    `;
    const bestCoverage = await sql<{
      id: string;
      board_name: string;
      source_mode: string;
      found_count: number;
      coverage: number;
      score: number;
      updated_at: string;
    }>`
      SELECT id, board_name, source_mode, found_count, coverage, score, updated_at
      FROM user_board_plays
      WHERE user_email = ${player.userKey}
        AND completed = TRUE
        AND timed = TRUE
        AND personal_best_eligible = TRUE
        AND source_mode NOT IN ('practice', 'training', 'infinite')
        AND (${includeInspiration} OR source_mode <> 'inspiration')
        AND (${includeBlitz} OR source_mode <> 'blitz')
      ORDER BY coverage DESC, found_count DESC, score DESC, updated_at DESC
      LIMIT 1
    `;
    const recentWords = await sql<WordRow>`
      SELECT word, times_found, last_seen
      FROM user_word_records
      WHERE user_email = ${player.userKey}
      ORDER BY last_seen DESC
      LIMIT 1000
    `;

    let rememberedCount = 0;
    try {
      const remembered = await sql<{ count: string }>`
        SELECT COUNT(*)::text AS count
        FROM remembered_boards
        WHERE user_email = ${player.userKey}
      `;
      rememberedCount = Number(remembered.rows[0]?.count ?? 0);
    } catch {
      rememberedCount = 0;
    }

    return NextResponse.json({
      ok: true,
      user: {
        id: player.id,
        name: player.name,
      },
      counts: {
        playedBoards: Number(playCount.rows[0]?.count ?? 0),
        completedTimedRounds: Number(completedTimedCount.rows[0]?.count ?? 0),
        dictionaryWords: Number(dictionaryCount.rows[0]?.count ?? 0),
        rememberedBoards: rememberedCount,
      },
      personalBest: {
        highestWordCount: highestWordCount.rows[0] ?? null,
        bestCoverage: bestCoverage.rows[0] ?? null,
        filters: { includeInspiration, includeBlitz },
      },
      dictionary: {
        recentWords: recentWords.rows.slice(0, 30),
        huntingRecommendations: buildHuntingRecommendations(recentWords.rows),
      },
    });
  } catch (error) {
    console.error('Public profile summary failed:', error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : 'Failed to load public profile.' },
      { status: 500 },
    );
  }
}
