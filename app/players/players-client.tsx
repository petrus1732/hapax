'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useState } from 'react';
import { useClientSession } from '@/app/lib/use-client-session';

type PlayerSearchResult = {
  id: string;
  name: string | null;
  played_boards: number;
  dictionary_words: number;
  completed_timed_rounds: number;
  latest_activity: string | null;
};

function formatDate(value?: string | null) {
  if (!value) return 'No activity yet';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

export default function PlayersClient() {
  const { data: session, status } = useClientSession();
  const [query, setQuery] = useState('');
  const [players, setPlayers] = useState<PlayerSearchResult[]>([]);
  const [message, setMessage] = useState('Loading players...');
  const [isSearching, setIsSearching] = useState(false);

  const searchPlayers = async (nextQuery = query) => {
    if (!session?.user) return;
    setIsSearching(true);
    setMessage('Searching players...');

    try {
      const response = await fetch(`/api/players/search?q=${encodeURIComponent(nextQuery)}`);
      const data = (await response.json()) as { players?: PlayerSearchResult[]; error?: string };
      if (!response.ok) throw new Error(data.error ?? 'Failed to search players.');
      setPlayers(data.players ?? []);
      setMessage((data.players ?? []).length === 0 ? 'No players matched that search.' : '');
    } catch (error) {
      setPlayers([]);
      setMessage(error instanceof Error ? error.message : 'Failed to search players.');
    } finally {
      setIsSearching(false);
    }
  };

  useEffect(() => {
    if (status === 'loading') return;
    if (!session?.user) {
      setPlayers([]);
      setMessage('Please log in to search player profiles.');
      return;
    }
    void searchPlayers('');
    // Run only when the login state becomes known.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user, status]);

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void searchPlayers(query);
  };

  return (
    <div className="w-full space-y-5">
      <section className="rounded-3xl border border-gray-200 bg-white/80 p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950/70">
        <h1 className="text-3xl font-black">Find players</h1>
        <p className="mt-2 text-sm text-gray-600 dark:text-zinc-300">
          Search registered users and view their public Word Blitz profile. Passwords and login credentials
          are never exposed.
        </p>

        <form onSubmit={onSubmit} className="mt-4 flex flex-col gap-2 sm:flex-row">
          <input
            className="min-h-11 flex-1 rounded-xl border border-gray-300 bg-white px-3 py-2 text-gray-950 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by player name"
            disabled={!session?.user || isSearching}
          />
          <button
            className="rounded-xl bg-blue-600 px-5 py-2 font-bold text-white shadow hover:bg-blue-700 disabled:opacity-50"
            disabled={!session?.user || isSearching}
          >
            {isSearching ? 'Searching...' : 'Search'}
          </button>
        </form>
      </section>

      {message && <div className="rounded-2xl bg-gray-100 p-3 text-sm dark:bg-zinc-900">{message}</div>}

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {players.map((player) => (
          <article
            key={player.id}
            className="rounded-2xl border border-gray-200 bg-white/80 p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950/70"
          >
            <div className="text-xl font-black">{player.name || `Player ${player.id.slice(0, 8)}`}</div>
            <div className="mt-1 text-xs text-gray-500 dark:text-zinc-400">
              Last active: {formatDate(player.latest_activity)}
            </div>
            <div className="mt-4 grid grid-cols-3 gap-2 text-center text-sm">
              <div className="rounded-xl bg-blue-50 p-2 text-blue-700 dark:bg-blue-950/50 dark:text-blue-200">
                <div className="text-xs opacity-70">Boards</div>
                <div className="text-xl font-black">{player.played_boards}</div>
              </div>
              <div className="rounded-xl bg-emerald-50 p-2 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-200">
                <div className="text-xs opacity-70">Timed</div>
                <div className="text-xl font-black">{player.completed_timed_rounds}</div>
              </div>
              <div className="rounded-xl bg-amber-50 p-2 text-amber-700 dark:bg-amber-950/50 dark:text-amber-200">
                <div className="text-xs opacity-70">Words</div>
                <div className="text-xl font-black">{player.dictionary_words}</div>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <Link
                className="rounded-xl bg-blue-600 px-3 py-2 text-sm font-bold text-white hover:bg-blue-700"
                href={`/players/view?userId=${encodeURIComponent(player.id)}`}
              >
                View profile
              </Link>
              <Link
                className="rounded-xl bg-gray-100 px-3 py-2 text-sm font-bold text-gray-950 hover:bg-gray-200 dark:bg-zinc-800 dark:text-zinc-50 dark:hover:bg-zinc-700"
                href={`/players/boards?userId=${encodeURIComponent(player.id)}&name=${encodeURIComponent(player.name ?? '')}`}
              >
                Boards
              </Link>
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}
