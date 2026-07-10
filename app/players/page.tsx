import PlayersClient from './players-client';

export default function PlayersPage() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-6xl flex-col gap-6 px-4 py-8">
      <PlayersClient />
    </main>
  );
}
