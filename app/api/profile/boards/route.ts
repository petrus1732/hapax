import { NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { auth } from '@/app/lib/auth';
import { currentUserKey, ensureProfileTables } from '@/app/lib/profile-storage';

export async function GET() {
  try {
    const session = await auth();
    const userKey = currentUserKey(session);
    if (!userKey) return NextResponse.json({ ok: false, error: 'Login required.' }, { status: 401 });

    await ensureProfileTables();
    const data = await sql`
      SELECT
        id,
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
        personal_best_eligible,
        date,
        updated_at
      FROM user_board_plays
      WHERE user_email = ${userKey}
      ORDER BY updated_at DESC
      LIMIT 300
    `;

    return NextResponse.json({ ok: true, boards: data.rows });
  } catch (error) {
    console.error('Profile boards failed:', error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : 'Failed to load boards.' },
      { status: 500 },
    );
  }
}
