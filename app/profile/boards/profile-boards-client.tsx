'use client';

import Link from 'next/link';
import { useMemo, useState, useEffect } from 'react';
import { useClientSession } from '@/app/lib/use-client-session';
import SquareBoard from '@/app/ui/square-board';
import { parseBonuses } from '@/app/lib/board-storage';
import { BOARD_SIZE, BonusOrNull, countBonuses, groupWordsByLength } from '@/app/lib/wordblitz';

type FoundWordRecord = {
  word: string;
  path?: number[];
  score?: number;
  inspired?: boolean;
};

type ProfileBoardRow = {
  id: string;
  board_name: string;
  size: number;
  letters: string;
  bonuses?: string | null;
  theme?: string | null;
  subtheme?: string | null;
  source_mode: string;
  round_mode?: string | null;
  abundance?: string | null;
  training_seed_word?: string | null;
  total_words: number;
  countable_words: number;
  found_count: number;
  coverage: number;
  score: number;
  found_words?: string | null;
  completed: boolean;
  timed: boolean;
  personal_best_eligible?: boolean;
  date: string;
  updated_at: string;
};

function parseFoundWords(value?: string | null): FoundWordRecord[] {
  if (!value) return [];

  try {
    const parsed = JSON.parse(value) as unknown;
    if (!Array.isArray(parsed)) return [];

    const output: FoundWordRecord[] = [];
    for (const item of parsed) {
      if (!item || typeof item !== 'object') continue;
      const record = item as Record<string, unknown>;
      const word = String(record.word ?? '').toUpperCase();
      if (!/^[A-Z]{2,24}$/.test(word)) continue;

      output.push({
        word,
        path: Array.isArray(record.path) ? record.path.map(Number).filter(Number.isFinite) : undefined,
        score: Number(record.score ?? 0),
        inspired: Boolean(record.inspired),
      });
    }

    return output;
  } catch {
    return [];
  }
}

function formatDate(value?: string | null) {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

export default function ProfileBoardsClient() {
  const { data: session, status } = useClientSession();
  const [boards, setBoards] = useState<ProfileBoardRow[]>([]);
  const [selected, setSelected] = useState<ProfileBoardRow | null>(null);
  const [message, setMessage] = useState('Loading your boards...');

  useEffect(() => {
    if (status === 'loading') return;
    if (!session?.user) {
      setMessage('Please log in to see your boards.');
      return;
    }

    fetch('/api/profile/boards')
      .then(async (response) => {
        const data = (await response.json()) as { boards?: ProfileBoardRow[]; error?: string };
        if (!response.ok) throw new Error(data.error ?? 'Failed to load your boards.');
        setBoards(data.boards ?? []);
        setSelected((data.boards ?? [])[0] ?? null);
        setMessage((data.boards ?? []).length === 0 ? 'No auto-saved boards yet.' : '');
      })
      .catch((error) => setMessage(error instanceof Error ? error.message : 'Failed to load your boards.'));
  }, [session?.user, status]);

  const selectedBonuses: BonusOrNull[] = useMemo(
    () => parseBonuses(selected?.bonuses, (selected?.size ?? BOARD_SIZE) * (selected?.size ?? BOARD_SIZE)),
    [selected],
  );
  const selectedFoundWords = useMemo(() => parseFoundWords(selected?.found_words), [selected]);
  const selectedFoundGroups = useMemo(
    () =>
      groupWordsByLength(
        selectedFoundWords
          .map((item) => item.word)
          .sort((a, b) => (a.length === b.length ? a.localeCompare(b) : a.length - b.length)),
      ),
    [selectedFoundWords],
  );
  const selectedFoundMap = useMemo(
    () => Object.fromEntries(selectedFoundWords.map((item) => [item.word, true])),
    [selectedFoundWords],
  );
  const bonusCounts = useMemo(() => countBonuses(selectedBonuses), [selectedBonuses]);
  const hasBonuses = selectedBonuses.some(Boolean);

  return (
    <div className="w-full space-y-5">
      <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
        <div>
          <h1 className="text-3xl font-black">My boards</h1>
          <p className="text-sm text-gray-600 dark:text-zinc-300">
            Every generated board is auto-saved for logged-in users. Bonus positions are preserved.
          </p>
        </div>
        <Link href="/profile" className="font-bold text-blue-600 hover:underline dark:text-blue-300">
          Back to profile
        </Link>
      </div>

      {message && <div className="rounded-2xl bg-gray-100 p-3 text-sm dark:bg-zinc-900">{message}</div>}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(340px,440px)]">
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white/80 dark:border-zinc-800 dark:bg-zinc-950/70">
          <div className="max-h-[70vh] overflow-auto">
            <table className="min-w-full text-sm">
              <thead className="sticky top-0 bg-gray-100 text-left dark:bg-zinc-900">
                <tr>
                  <th className="px-3 py-3 font-bold">Board</th>
                  <th className="px-3 py-3 font-bold">Mode</th>
                  <th className="px-3 py-3 font-bold">Words</th>
                  <th className="px-3 py-3 font-bold">Coverage</th>
                  <th className="px-3 py-3 font-bold">Score</th>
                  <th className="px-3 py-3 font-bold">Saved</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-zinc-800">
                {boards.map((board) => (
                  <tr
                    key={board.id}
                    className={`cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-950/30 ${
                      selected?.id === board.id ? 'bg-blue-50 dark:bg-blue-950/30' : ''
                    }`}
                    onClick={() => setSelected(board)}
                  >
                    <td className="px-3 py-3">
                      <div className="font-bold">{board.board_name}</div>
                      <div className="font-mono text-xs text-gray-500 dark:text-zinc-400">
                        {board.letters}
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      {board.source_mode}
                      {board.round_mode ? <div className="text-xs opacity-60">{board.round_mode}</div> : null}
                      {board.personal_best_eligible ? (
                        <div className="mt-1 text-xs font-bold text-emerald-600 dark:text-emerald-300">
                          PB eligible
                        </div>
                      ) : null}
                    </td>
                    <td className="px-3 py-3">
                      {board.found_count}/{board.countable_words || board.total_words || 0}
                    </td>
                    <td className="px-3 py-3">{Number(board.coverage ?? 0).toFixed(1)}%</td>
                    <td className="px-3 py-3">{board.score}</td>
                    <td className="px-3 py-3 text-xs text-gray-500 dark:text-zinc-400">
                      {formatDate(board.updated_at)}
                      {!board.completed ? <div className="text-amber-600">not finished</div> : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <aside className="rounded-2xl border border-gray-200 bg-white/80 p-4 dark:border-zinc-800 dark:bg-zinc-950/70">
          {!selected ? (
            <div className="text-sm text-gray-500">Choose a board to preview it.</div>
          ) : (
            <div className="space-y-4">
              <div>
                <h2 className="text-xl font-black">{selected.board_name}</h2>
                <div className="mt-1 text-xs text-gray-500 dark:text-zinc-400">
                  {selected.abundance ?? 'unclassified'} · {selected.total_words} total words
                  {selected.training_seed_word ? ` · seed ${selected.training_seed_word}` : ''}
                </div>
                {hasBonuses && (
                  <div className="mt-1 text-xs text-gray-500 dark:text-zinc-400">
                    Bonuses:{' '}
                    {(Object.entries(bonusCounts) as Array<[string, number]>)
                      .filter(([, value]) => value > 0)
                      .map(([label, value]) => `${label}×${value}`)
                      .join(', ')}
                  </div>
                )}
              </div>

              <SquareBoard
                size={selected.size}
                letters={selected.letters}
                swiped={selectedFoundMap}
                setSwiped={() => undefined}
                validWords={selectedFoundGroups}
                minLength={2}
                bonuses={selectedBonuses}
                showTileScores={hasBonuses}
                disabled
              />

              <div>
                <h3 className="mb-2 font-bold">Found words</h3>
                <div className="max-h-64 overflow-auto rounded-xl bg-gray-50 p-3 text-sm dark:bg-zinc-900">
                  {selectedFoundWords.length === 0 ? (
                    <span className="text-gray-500">No found words recorded.</span>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {selectedFoundWords
                        .sort((a, b) => b.word.length - a.word.length || a.word.localeCompare(b.word))
                        .map((item) => (
                          <span key={item.word} className="rounded-full bg-white px-2 py-1 dark:bg-zinc-950">
                            {item.word}
                            {item.inspired ? (
                              <span className="ml-1 text-xs text-purple-500">hint</span>
                            ) : null}
                          </span>
                        ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
