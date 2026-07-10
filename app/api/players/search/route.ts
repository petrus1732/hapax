import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/app/lib/auth';
import { currentUserKey } from '@/app/lib/profile-storage';
import { searchPublicPlayers } from '@/app/lib/public-profile-storage';
import { normalizePlayerSearchTerm } from '@/app/lib/public-profile-utils';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!currentUserKey(session)) {
      return NextResponse.json({ ok: false, error: 'Login required.' }, { status: 401 });
    }

    const query = normalizePlayerSearchTerm(request.nextUrl.searchParams.get('q'));
    const players = await searchPublicPlayers(query, 30);

    return NextResponse.json({ ok: true, query, players });
  } catch (error) {
    console.error('Player search failed:', error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : 'Failed to search players.' },
      { status: 500 },
    );
  }
}
