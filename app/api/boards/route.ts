import { NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import type { Board } from '@/app/lib/definitions';
import { normalizeStoredBoard } from '@/app/lib/training-mode';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const data = await sql<Board>`SELECT * FROM boards ORDER BY date DESC`;
    return NextResponse.json({ boards: data.rows.map((board) => normalizeStoredBoard(board)) });
  } catch (error) {
    console.error('Board list failed:', error);
    return NextResponse.json({ boards: [], error: 'Failed to load saved boards.' }, { status: 500 });
  }
}
