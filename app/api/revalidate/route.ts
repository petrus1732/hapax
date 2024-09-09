import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const path = searchParams.get('path');

  if (!path) {
    return NextResponse.json({ error: 'Path is required' }, { status: 400 });
  }

  try {
    // Revalidate the specified path
    await revalidatePath(path);
    return NextResponse.json({ revalidated: true });
  } catch (err) {
    console.error('Failed to revalidate:', err);
    return NextResponse.json({ error: 'Failed to revalidate' }, { status: 500 });
  }
}
