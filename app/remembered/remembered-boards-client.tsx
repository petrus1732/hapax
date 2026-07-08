'use client';

import { useEffect, useMemo, useState } from 'react';
import { useClientSession } from '@/app/lib/use-client-session';
import SquareBoard from '@/app/ui/square-board';
import { findWords } from '@/app/lib/find-words';
import { Trie } from '@/app/lib/trie';
import { parseBonuses } from '@/app/lib/board-storage';
import { BOARD_SIZE, BonusOrNull, countBonuses, groupWordsByLength } from '@/app/lib/wordblitz';

type RememberedBoardRow = {
  id: string;
  board_name: string;
  size: number;
  letters: string;
  bonuses?: string | null;
  theme?: string | null;
  subtheme?: string | null;
  source_mode?: string | null;
  abundance?: string | null;
  training_seed_word?: string | null;
  date: string;
};

export default function RememberedBoardsClient() {
  const { data: session, status } = useClientSession();
  const [boards, setBoards] = useState<RememberedBoardRow[]>([]);
  const [selected, setSelected] = useState<RememberedBoardRow | null>(null);
  const [swiped, setSwiped] = useState<Record<string, boolean>>({});
  const [wordlist, setWordlist] = useState<string[]>([]);
  const [trie, setTrie] = useState<Trie | null>(null);
  const [words, setWords] = useState<string[][]>([]);
  const [message, setMessage] = useState('Loading remembered boards...');

  useEffect(() => {
    if (status === 'loading') return;
    if (!session?.user) {
      setMessage('Please log in to see remembered boards.');
      return;
    }

    fetch('/api/remembered-boards')
      .then(async (response) => {
        const data = (await response.json()) as { boards?: RememberedBoardRow[]; error?: string };
        if (!response.ok) throw new Error(data.error ?? 'Failed to load remembered boards.');
        setBoards(data.boards ?? []);
        setMessage((data.boards ?? []).length === 0 ? 'No remembered boards yet.' : '');
      })
      .catch((error) =>
        setMessage(error instanceof Error ? error.message : 'Failed to load remembered boards.'),
      );
  }, [session?.user, status]);

  useEffect(() => {
    fetch('/api/wordlist')
      .then(async (response) => {
        if (!response.ok) throw new Error('Failed to load word list.');
        const data = (await response.json()) as { message: string[] };
        setWordlist(data.message.map((word) => word.toUpperCase()).filter(Boolean));
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    if (wordlist.length === 0 || trie) return;
    const nextTrie = new Trie();
    for (const word of wordlist) nextTrie.insert(word);
    setTrie(nextTrie);
  }, [trie, wordlist]);

  useEffect(() => {
    if (!selected || !trie) return;
    const found = findWords(selected.size, selected.letters, trie)[0]
      .filter((word) => word.length >= 2)
      .sort((a, b) => (a.length === b.length ? (a < b ? -1 : 1) : a.length - b.length));
    setWords(groupWordsByLength(found));
    setSwiped({});
  }, [selected, trie]);

  const selectedBonuses: BonusOrNull[] = useMemo(
    () => parseBonuses(selected?.bonuses, (selected?.size ?? BOARD_SIZE) * (selected?.size ?? BOARD_SIZE)),
    [selected],
  );
  const bonusCounts = useMemo(() => countBonuses(selectedBonuses), [selectedBonuses]);
  const hasBonuses = selectedBonuses.some(Boolean);
  const flatWords = words.flat().filter(Boolean);

  return (
    <div className="w-full">
      <h1 className="mb-4 text-2xl font-black">Remembered boards</h1>
      {message && <div className="mb-4 rounded-xl bg-gray-100 p-3 text-sm dark:bg-zinc-900">{message}</div>}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(320px,420px)]">
        <div className="rounded-2xl border border-gray-200 bg-white/80 p-3 dark:border-zinc-800 dark:bg-zinc-950/70">
          {boards.map((board) => (
            <button
              key={board.id}
              className={`mb-2 block w-full rounded-xl border p-3 text-left hover:bg-gray-50 dark:hover:bg-zinc-900 ${
                selected?.id === board.id
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/40'
                  : 'border-gray-200 dark:border-zinc-800'
              }`}
              onClick={() => setSelected(board)}
            >
              <div className="font-bold">{board.board_name}</div>
              <div className="text-xs text-gray-500 dark:text-zinc-400">
                {board.letters} · {board.abundance ?? 'unclassified'} · {board.date}
                {board.training_seed_word ? ` · seed ${board.training_seed_word}` : ''}
              </div>
            </button>
          ))}
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white/80 p-3 dark:border-zinc-800 dark:bg-zinc-950/70">
          {!selected ? (
            <div className="text-sm text-gray-500">Choose a remembered board to preview it.</div>
          ) : (
            <>
              <div className="mb-3 text-sm font-semibold">
                <div>{flatWords.length} total words</div>
                {hasBonuses && (
                  <div className="text-xs text-gray-500 dark:text-zinc-400">
                    Bonuses:{' '}
                    {Object.entries(bonusCounts)
                      .filter(([, value]) => value > 0)
                      .map(([label, value]) => `${label}×${value}`)
                      .join(', ')}
                  </div>
                )}
              </div>
              <SquareBoard
                size={selected.size}
                letters={selected.letters}
                swiped={swiped}
                setSwiped={setSwiped}
                validWords={words}
                minLength={2}
                bonuses={selectedBonuses}
                showTileScores={hasBonuses}
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
