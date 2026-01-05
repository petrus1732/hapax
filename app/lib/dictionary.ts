'use server'

import fs from 'fs';
import path from 'path';

let dictionaryCache: Record<string, string> | null = null;
let wordsCache: string[] | null = null;

function loadDictionary() {
    if (dictionaryCache) return { dictionary: dictionaryCache, words: wordsCache! };

    const filePath = path.join(process.cwd(), 'app/lib/dictionary.json');
    if (!fs.existsSync(filePath)) {
        throw new Error('Dictionary data not found. Please run preprocessing first.');
    }

    const content = fs.readFileSync(filePath, 'utf-8');
    dictionaryCache = JSON.parse(content);
    wordsCache = Object.keys(dictionaryCache!).sort();

    return { dictionary: dictionaryCache!, words: wordsCache! };
}

export async function getDefinition(word: string): Promise<string | null> {
    const { dictionary } = loadDictionary();
    return dictionary[word.toUpperCase()] || null;
}

export async function searchWords(query: string, limit: number = 50): Promise<string[]> {
    const { words } = loadDictionary();
    const upperQuery = query.toUpperCase();

    if (!upperQuery) return [];

    // Finding words that start with the query
    const matches: string[] = [];
    for (const word of words) {
        if (word.startsWith(upperQuery)) {
            matches.push(word);
            if (matches.length >= limit) break;
        }
    }

    return matches;
}

export async function getWordsByLetter(letter: string, page: number = 1, pageSize: number = 100): Promise<{ words: string[], total: number }> {
    const { words } = loadDictionary();
    const upperLetter = letter.toUpperCase();

    const filteredWords = words.filter(word => word.startsWith(upperLetter));
    const start = (page - 1) * pageSize;
    const end = start + pageSize;

    return {
        words: filteredWords.slice(start, end),
        total: filteredWords.length
    };
}
