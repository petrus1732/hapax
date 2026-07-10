'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import ProfileBoardsClient from '@/app/profile/boards/profile-boards-client';

function readParam(name: string) {
  if (typeof window === 'undefined') return '';
  return new URLSearchParams(window.location.search).get(name) ?? '';
}

export default function PlayerBoardsClient() {
  const [userId, setUserId] = useState('');
  const [name, setName] = useState('');

  useEffect(() => {
    setUserId(readParam('userId'));
    setName(readParam('name'));
  }, []);

  if (!userId) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white/80 p-6 text-sm dark:border-zinc-800 dark:bg-zinc-950/70">
        No player was selected.{' '}
        <Link href="/players" className="font-bold text-blue-600 hover:underline dark:text-blue-300">
          Search players
        </Link>
      </div>
    );
  }

  return (
    <ProfileBoardsClient
      userId={userId}
      ownerName={name || undefined}
      backHref={`/players/view?userId=${encodeURIComponent(userId)}`}
      backLabel="Back to player profile"
    />
  );
}
