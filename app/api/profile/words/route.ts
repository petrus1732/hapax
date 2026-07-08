import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/app/lib/auth';
import { currentUserKey, ensureProfileTables, normalizeFoundWords, upsertDictionaryWords } from '@/app/lib/profile-storage';

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    const userKey = currentUserKey(session);
    if (!userKey) return NextResponse.json({ ok: false, error: 'Login required.' }, { status: 401 });

    const body = (await request.json()) as { word?: string; path?: number[]; score?: number; inspired?: boolean };
    const words = normalizeFoundWords([{ word: body.word, path: body.path, score: body.score, inspired: body.inspired }]);
    if (words.length === 0) throw new Error('Invalid word.');

    await ensureProfileTables();
    await upsertDictionaryWords(session, words, { includeInspired: false });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Profile word save failed:', error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : 'Failed to save word.' },
      { status: 400 },
    );
  }
}
