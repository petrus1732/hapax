'use client';

import { useState, useEffect, useCallback } from 'react';
import { getWordsByLetter, searchWords, getDefinition } from '../lib/dictionary';
import { Button } from '../ui/button';

export default function DictionaryPage() {
  const [activeLetter, setActiveLetter] = useState('A');
  const [words, setWords] = useState<string[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedWord, setSelectedWord] = useState<string | null>(null);
  const [definition, setDefinition] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

  const fetchWords = useCallback(async (letter: string, p: number) => {
    setLoading(true);
    try {
      const result = await getWordsByLetter(letter, p);
      setWords(result.words);
      setTotal(result.total);
    } catch (error) {
      console.error('Failed to fetch words:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    if (query.length >= 2) {
      setLoading(true);
      try {
        const matches = await searchWords(query);
        setWords(matches);
        setTotal(matches.length);
        setPage(1); // Reset page on search
      } catch (error) {
        console.error('Search failed:', error);
      } finally {
        setLoading(false);
      }
    } else if (query.length === 0) {
      fetchWords(activeLetter, 1);
    }
  };

  const handleWordClick = async (word: string) => {
    setLoading(true);
    setSelectedWord(word);
    try {
      const def = await getDefinition(word);
      setDefinition(def);
    } catch (error) {
      console.error('Failed to fetch definition:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!searchQuery) {
      fetchWords(activeLetter, page);
    }
  }, [activeLetter, page, fetchWords, searchQuery]);

  return (
    <div className="pt-20 px-4 max-w-4xl mx-auto min-h-screen bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      <h1 className="text-3xl font-bold mb-6 text-center">Dictionary</h1>

      {/* Search Box */}
      <div className="mb-8">
        <input
          type="text"
          placeholder="Search for a word..."
          className="w-full p-3 rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={searchQuery}
          onChange={(e) => handleSearch(e.target.value)}
        />
      </div>

      {/* Alphabetical Index */}
      <div className="flex flex-wrap justify-center gap-2 mb-8">
        {letters.map((letter) => (
          <button
            key={letter}
            className={`w-10 h-10 rounded-md transition-colors ${
              activeLetter === letter && !searchQuery
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 dark:bg-gray-800 hover:bg-gray-300 dark:hover:bg-gray-700'
            }`}
            onClick={() => {
              setActiveLetter(letter);
              setPage(1);
              setSearchQuery('');
              setSelectedWord(null);
            }}
          >
            {letter}
          </button>
        ))}
      </div>

      {/* Main Content Area */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Word List */}
        <div className="border border-gray-200 dark:border-gray-800 rounded-lg overflow-hidden flex flex-col h-[600px]">
          <div className="bg-gray-100 dark:bg-gray-800 p-3 font-semibold border-b border-gray-200 dark:border-gray-700 flex justify-between">
            <span>{searchQuery ? 'Search Results' : `Words starting with ${activeLetter}`}</span>
            <span className="text-gray-500 text-sm">{total} words</span>
          </div>
          <div className="overflow-y-auto flex-grow p-2">
            {loading && words.length === 0 ? (
              <div className="flex justify-center items-center h-full">Loading...</div>
            ) : words.length > 0 ? (
              <ul className="space-y-1">
                {words.map((word) => (
                  <li key={word}>
                    <button
                      className={`w-full text-left p-2 rounded transition-colors ${
                        selectedWord === word
                          ? 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-100'
                          : 'hover:bg-gray-100 dark:hover:bg-gray-800'
                      }`}
                      onClick={() => handleWordClick(word)}
                    >
                      {word}
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="p-4 text-center text-gray-500">No words found.</div>
            )}
          </div>

          {/* Pagination */}
          {!searchQuery && total > 100 && (
            <div className="p-3 bg-gray-50 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 flex justify-between items-center">
              <Button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>
                Prev
              </Button>
              <span className="text-sm">
                Page {page} of {Math.ceil(total / 100)}
              </span>
              <Button
                onClick={() => setPage((p) => (p * 100 < total ? p + 1 : p))}
                disabled={page * 100 >= total}
              >
                Next
              </Button>
            </div>
          )}
        </div>

        {/* Definition Details */}
        <div className="border border-gray-200 dark:border-gray-800 rounded-lg p-6 bg-gray-50 dark:bg-gray-800 overflow-y-auto h-[600px]">
          {selectedWord ? (
            <div>
              <h2 className="text-2xl font-bold mb-4 text-blue-600 dark:text-blue-400">{selectedWord}</h2>
              {loading && !definition ? (
                <div>Loading definition...</div>
              ) : (
                <div className="prose dark:prose-invert">
                  <p className="text-lg leading-relaxed whitespace-pre-wrap">
                    {definition || 'No definition available.'}
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-gray-400 text-center">
              <svg
                className="w-16 h-16 mb-4 opacity-20"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                ></path>
              </svg>
              <p>Select a word to see its definition.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
