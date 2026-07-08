'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useClientSession } from '@/app/lib/use-client-session';

type BestRound = {
  id: string;
  board_name: string;
  source_mode: string;
  found_count: number;
  coverage: number;
  score: number;
  updated_at: string;
};

type RecentWord = {
  word: string;
  times_found: number;
  last_seen: string;
};

type HuntingRecommendation = {
  word: string;
  reason: string;
  score: number;
};

type ProfileSummary = {
  user: { name: string | null; email: string | null };
  counts: {
    playedBoards: number;
    completedTimedRounds: number;
    dictionaryWords: number;
    rememberedBoards: number;
  };
  personalBest: {
    highestWordCount: BestRound | null;
    bestCoverage: BestRound | null;
    filters: { includeInspiration: boolean; includeBlitz: boolean };
  };
  dictionary: {
    recentWords: RecentWord[];
    huntingRecommendations: HuntingRecommendation[];
  };
};

function formatDate(value?: string | null) {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

function BestCard({ title, round, empty }: { title: string; round: BestRound | null; empty: string }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white/80 p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950/70">
      <div className="text-sm font-bold uppercase tracking-wide text-gray-500 dark:text-zinc-400">{title}</div>
      {!round ? (
        <div className="mt-3 text-sm text-gray-500 dark:text-zinc-400">{empty}</div>
      ) : (
        <div className="mt-3 space-y-2">
          <div className="text-lg font-black">{round.board_name}</div>
          <div className="grid grid-cols-3 gap-2 text-center text-sm">
            <div className="rounded-xl bg-blue-50 p-2 text-blue-700 dark:bg-blue-950/50 dark:text-blue-200">
              <div className="text-xs opacity-70">Words</div>
              <div className="text-xl font-black">{round.found_count}</div>
            </div>
            <div className="rounded-xl bg-emerald-50 p-2 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-200">
              <div className="text-xs opacity-70">Coverage</div>
              <div className="text-xl font-black">{Number(round.coverage ?? 0).toFixed(1)}%</div>
            </div>
            <div className="rounded-xl bg-purple-50 p-2 text-purple-700 dark:bg-purple-950/50 dark:text-purple-200">
              <div className="text-xs opacity-70">Score</div>
              <div className="text-xl font-black">{round.score}</div>
            </div>
          </div>
          <div className="text-xs text-gray-500 dark:text-zinc-400">
            {round.source_mode} · {formatDate(round.updated_at)}
          </div>
        </div>
      )}
    </div>
  );
}

export default function ProfileClient() {
  const { data: session, status } = useClientSession();
  const [includeInspiration, setIncludeInspiration] = useState(true);
  const [includeBlitz, setIncludeBlitz] = useState(true);
  const [summary, setSummary] = useState<ProfileSummary | null>(null);
  const [message, setMessage] = useState('Loading profile...');

  const query = useMemo(
    () => `includeInspiration=${includeInspiration}&includeBlitz=${includeBlitz}`,
    [includeBlitz, includeInspiration],
  );

  useEffect(() => {
    if (status === 'loading') return;
    if (!session?.user) {
      setSummary(null);
      setMessage('Please log in to see your profile.');
      return;
    }

    setMessage('Loading profile...');
    fetch(`/api/profile/summary?${query}`)
      .then(async (response) => {
        const data = (await response.json()) as ProfileSummary & { error?: string };
        if (!response.ok) throw new Error(data.error ?? 'Failed to load profile.');
        setSummary(data);
        setMessage('');
      })
      .catch((error) => {
        setSummary(null);
        setMessage(error instanceof Error ? error.message : 'Failed to load profile.');
      });
  }, [query, session?.user, status]);

  if (message && !summary) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white/80 p-6 text-sm dark:border-zinc-800 dark:bg-zinc-950/70">
        {message}{' '}
        {!session?.user && (
          <Link href="/login" className="font-bold text-blue-600 hover:underline dark:text-blue-300">
            Log in
          </Link>
        )}
      </div>
    );
  }

  if (!summary) return null;

  return (
    <div className="w-full space-y-6">
      <section className="rounded-3xl border border-gray-200 bg-white/80 p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950/70">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div>
            <h1 className="text-3xl font-black">My profile</h1>
            <div className="mt-2 text-sm text-gray-600 dark:text-zinc-300">
              <div>Name: {summary.user.name ?? '—'}</div>
              <div>Email: {summary.user.email ?? '—'}</div>
            </div>
          </div>
          <Link
            href="/profile/boards"
            className="rounded-2xl bg-blue-600 px-5 py-3 text-center font-bold text-white shadow hover:bg-blue-700"
          >
            Look at my boards
          </Link>
        </div>
      </section>

      <section className="grid gap-3 md:grid-cols-4">
        <Stat label="Auto-saved boards" value={summary.counts.playedBoards} />
        <Stat label="Timed rounds" value={summary.counts.completedTimedRounds} />
        <Stat label="Dictionary words" value={summary.counts.dictionaryWords} />
        <Stat label="Remembered boards" value={summary.counts.rememberedBoards} />
      </section>

      <section className="rounded-3xl border border-gray-200 bg-white/80 p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950/70">
        <div className="mb-4 flex flex-col justify-between gap-3 md:flex-row md:items-center">
          <div>
            <h2 className="text-2xl font-black">Personal Best</h2>
            <p className="text-sm text-gray-600 dark:text-zinc-300">
              Practice, Training, and Infinite are excluded. Inspiration and Blitz can be toggled separately.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 text-sm">
            <label className="flex items-center gap-2 rounded-xl border border-gray-200 px-3 py-2 dark:border-zinc-800">
              <input
                type="checkbox"
                checked={includeInspiration}
                onChange={(event) => setIncludeInspiration(event.target.checked)}
              />
              include inspiration
            </label>
            <label className="flex items-center gap-2 rounded-xl border border-gray-200 px-3 py-2 dark:border-zinc-800">
              <input
                type="checkbox"
                checked={includeBlitz}
                onChange={(event) => setIncludeBlitz(event.target.checked)}
              />
              include blitz
            </label>
          </div>
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <BestCard
            title="Highest word count"
            round={summary.personalBest.highestWordCount}
            empty="No completed timed round matches this filter yet."
          />
          <BestCard
            title="Best coverage"
            round={summary.personalBest.bestCoverage}
            empty="No completed timed round matches this filter yet."
          />
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(320px,420px)]">
        <div className="rounded-3xl border border-gray-200 bg-white/80 p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950/70">
          <h2 className="text-2xl font-black">Dictionary record</h2>
          <p className="mt-1 text-sm text-gray-600 dark:text-zinc-300">
            Words are recorded from accepted manual swipes. Inspiration auto-hints are not counted as manual hunts.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {summary.dictionary.recentWords.length === 0 ? (
              <span className="text-sm text-gray-500">No words recorded yet.</span>
            ) : (
              summary.dictionary.recentWords.map((item) => (
                <span
                  key={item.word}
                  className="rounded-full bg-gray-100 px-3 py-1 text-sm font-semibold dark:bg-zinc-900"
                  title={`seen ${item.times_found} time(s), last ${formatDate(item.last_seen)}`}
                >
                  {item.word}
                  {item.times_found > 1 ? <span className="ml-1 opacity-60">×{item.times_found}</span> : null}
                </span>
              ))
            )}
          </div>
        </div>

        <div className="rounded-3xl border border-amber-200 bg-amber-50 p-5 shadow-sm dark:border-amber-900 dark:bg-amber-950/40">
          <h2 className="text-2xl font-black text-amber-800 dark:text-amber-100">Hunting top 3</h2>
          <p className="mt-1 text-sm text-amber-800/75 dark:text-amber-100/75">
            Heuristic: look for one-letter extensions or nearby swaps from your known words.
          </p>
          <div className="mt-4 space-y-3">
            {summary.dictionary.huntingRecommendations.map((item, index) => (
              <div key={item.word} className="rounded-2xl bg-white/80 p-3 dark:bg-zinc-950/60">
                <div className="text-xs font-bold uppercase tracking-wide text-amber-700 dark:text-amber-200">
                  #{index + 1}
                </div>
                <div className="text-2xl font-black">{item.word}</div>
                <div className="text-sm text-gray-600 dark:text-zinc-300">{item.reason}</div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white/80 p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950/70">
      <div className="text-sm font-bold uppercase tracking-wide text-gray-500 dark:text-zinc-400">{label}</div>
      <div className="mt-2 text-3xl font-black">{value}</div>
    </div>
  );
}
