import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { auth } from '@/app/lib/auth';
import { serializeBonuses, validatePersistedBoardPayload } from '@/app/lib/board-storage';

async function ensureRememberedBoardsTable() {
  await sql`
    CREATE TABLE IF NOT EXISTS remembered_boards (
      id TEXT PRIMARY KEY,
      user_email TEXT NOT NULL,
      user_name TEXT,
      board_name TEXT NOT NULL,
      size INTEGER NOT NULL,
      letters TEXT NOT NULL,
      bonuses TEXT,
      theme TEXT,
      subtheme TEXT,
      source_mode TEXT,
      abundance TEXT,
      training_seed_word TEXT,
      date TEXT NOT NULL
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS remembered_boards_user_email_idx ON remembered_boards (user_email)`;
}

function currentUserKey(session: Awaited<ReturnType<typeof auth>>) {
  return session?.user?.email ?? session?.user?.name ?? null;
}

export async function GET() {
  try {
    const session = await auth();
    const userKey = currentUserKey(session);
    if (!userKey) return NextResponse.json({ ok: false, error: 'Login required.' }, { status: 401 });

    await ensureRememberedBoardsTable();
    const data = await sql`
      SELECT *
      FROM remembered_boards
      WHERE user_email = ${userKey}
      ORDER BY date DESC
    `;

    return NextResponse.json({ ok: true, boards: data.rows });
  } catch (error) {
    console.error('Remembered boards fetch failed:', error);
    return NextResponse.json({ ok: false, error: 'Failed to load remembered boards.' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    const userKey = currentUserKey(session);
    if (!userKey) return NextResponse.json({ ok: false, error: 'Login required.' }, { status: 401 });

    const payload = validatePersistedBoardPayload(await request.json());
    const id = crypto.randomUUID();
    const date = new Date().toISOString();

    await ensureRememberedBoardsTable();
    await sql`
      INSERT INTO remembered_boards (
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
        abundance,
        training_seed_word,
        date
      )
      VALUES (
        ${id},
        ${userKey},
        ${session?.user?.name ?? null},
        ${payload.boardName},
        ${payload.size},
        ${payload.letters},
        ${serializeBonuses(payload.bonuses)},
        ${payload.theme},
        ${payload.subtheme},
        ${payload.sourceMode},
        ${payload.abundance},
        ${payload.trainingSeedWord},
        ${date}
      )
    `;

    return NextResponse.json({ ok: true, id });
  } catch (error) {
    console.error('Remember board failed:', error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : 'Failed to remember board.' },
      { status: 400 },
    );
  }
}
