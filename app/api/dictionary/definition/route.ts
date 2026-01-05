import { NextResponse } from 'next/server';
import { getDefinition } from '@/app/lib/dictionary';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const word = searchParams.get('word');

    if (!word) {
        return NextResponse.json({ error: 'Word parameter is required' }, { status: 400 });
    }

    try {
        const definition = await getDefinition(word);
        return NextResponse.json({ word, definition });
    } catch (error) {
        console.error('Error fetching definition:', error);
        return NextResponse.json({ error: 'Failed to fetch definition' }, { status: 500 });
    }
}
