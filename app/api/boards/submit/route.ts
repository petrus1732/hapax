import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { auth } from '@/app/lib/auth';
import { serializeBonuses, validatePersistedBoardPayload } from '@/app/lib/board-storage';
import { sessionUserEmail, sessionUserName } from '@/app/lib/profile-storage';

async function ensureBoardMetadataColumns() {
  await sql`ALTER TABLE boards ADD COLUMN IF NOT EXISTS bonuses TEXT`;
  await sql`ALTER TABLE boards ADD COLUMN IF NOT EXISTS source_mode TEXT`;
  await sql`ALTER TABLE boards ADD COLUMN IF NOT EXISTS abundance TEXT`;
  await sql`ALTER TABLE boards ADD COLUMN IF NOT EXISTS training_seed_word TEXT`;
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    const payload = validatePersistedBoardPayload(await request.json());
    const author = sessionUserName(session) ?? sessionUserEmail(session) ?? 'anonymous';
    const date = new Date().toISOString().split('T')[0];

    await ensureBoardMetadataColumns();
    await sql`
      INSERT INTO boards (author, "boardName", size, letters, date, theme, subtheme, bonuses, source_mode, abundance, training_seed_word)
      VALUES (
        ${author},
        ${payload.boardName},
        ${payload.size},
        ${payload.letters},
        ${date},
        ${payload.theme},
        ${payload.subtheme},
        ${serializeBonuses(payload.bonuses)},
        ${payload.sourceMode},
        ${payload.abundance},
        ${payload.trainingSeedWord}
      )
    `;

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Board submit failed:', error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : 'Failed to submit board.' },
      { status: 400 },
    );
  }
}
