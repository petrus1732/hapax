import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { auth } from '@/app/lib/auth';
import {
  currentUserKey,
  ensureProfileTables,
  sessionUserName,
  roundRecordToSqlFields,
  upsertDictionaryWords,
  validateRoundRecordPayload,
} from '@/app/lib/profile-storage';

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    const userKey = currentUserKey(session);
    if (!userKey) return NextResponse.json({ ok: false, error: 'Login required.' }, { status: 401 });

    const body = (await request.json()) as { action?: string; round?: unknown };
    const payload = validateRoundRecordPayload(body.round ?? body);
    const fields = roundRecordToSqlFields(payload);
    const id = payload.id ?? crypto.randomUUID();
    const now = new Date().toISOString();
    const date = now;

    await ensureProfileTables();

    if (body.action === 'update' && payload.id) {
      await sql`
        UPDATE user_board_plays
        SET
          board_name = ${fields.boardName},
          bonuses = ${fields.bonusesSerialized},
          total_words = ${fields.totalWords ?? 0},
          countable_words = ${fields.countableWords},
          found_count = ${fields.foundCount},
          coverage = ${fields.coverage},
          score = ${fields.score ?? 0},
          found_words = ${fields.foundWordsSerialized},
          completed = ${fields.completed ?? false},
          timed = ${fields.timed},
          updated_at = ${now}
        WHERE id = ${payload.id} AND user_email = ${userKey}
      `;
    } else {
      await sql`
        INSERT INTO user_board_plays (
          id,
          user_email,
          user_name,
          board_name,
          size,
          letters,
          bonuses,
          theme,
          subtheme,
          source_mode,
          round_mode,
          abundance,
          training_seed_word,
          total_words,
          countable_words,
          found_count,
          coverage,
          score,
          found_words,
          completed,
          timed,
          date,
          updated_at
        )
        VALUES (
          ${id},
          ${userKey},
          ${sessionUserName(session)},
          ${fields.boardName},
          ${fields.size},
          ${fields.letters},
          ${fields.bonusesSerialized},
          ${fields.theme ?? null},
          ${fields.subtheme ?? null},
          ${String(fields.sourceMode)},
          ${fields.roundMode ?? null},
          ${fields.abundance ?? null},
          ${fields.trainingSeedWord ?? null},
          ${fields.totalWords ?? 0},
          ${fields.countableWords},
          ${fields.foundCount},
          ${fields.coverage},
          ${fields.score ?? 0},
          ${fields.foundWordsSerialized},
          ${fields.completed ?? false},
          ${fields.timed},
          ${date},
          ${now}
        )
        ON CONFLICT (id)
        DO UPDATE SET
          user_name = EXCLUDED.user_name,
          board_name = EXCLUDED.board_name,
          bonuses = EXCLUDED.bonuses,
          total_words = EXCLUDED.total_words,
          countable_words = EXCLUDED.countable_words,
          found_count = EXCLUDED.found_count,
          coverage = EXCLUDED.coverage,
          score = EXCLUDED.score,
          found_words = EXCLUDED.found_words,
          completed = EXCLUDED.completed,
          timed = EXCLUDED.timed,
          updated_at = EXCLUDED.updated_at
      `;
    }

    if (fields.foundWords.length > 0) {
      await upsertDictionaryWords(session, fields.foundWords, { includeInspired: false, increment: false });
    }

    return NextResponse.json({ ok: true, id });
  } catch (error) {
    console.error('Profile round save failed:', error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : 'Failed to save round.' },
      { status: 400 },
    );
  }
}
