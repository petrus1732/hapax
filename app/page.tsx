import Link from 'next/link';

export default function Home() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center p-8">
      <div className="grid w-full max-w-sm gap-4 text-center">
        <Link
          href="/random-board"
          className="flex min-h-20 grow flex-col items-center justify-center gap-1 rounded-2xl border border-blue-200 bg-blue-50 p-4 text-xl font-black text-blue-700 hover:bg-blue-100 dark:border-blue-900 dark:bg-blue-950 dark:text-blue-100"
        >
          Word Blitz Practice Lab
          <span className="text-sm font-medium opacity-75">practice, events, arena, and training modes</span>
        </Link>
        <Link
          href="/create"
          className="flex h-16 grow items-center justify-center gap-2 rounded-md border border-gray-300 p-3 text-xl font-medium hover:bg-sky-100 hover:text-blue-600 dark:border-neutral-700"
        >
          Create
        </Link>
        <Link
          href="/boards"
          className="flex h-16 grow items-center justify-center gap-2 rounded-md border border-gray-300 p-3 text-xl font-medium hover:bg-sky-100 hover:text-blue-600 dark:border-neutral-700"
        >
          Boards
        </Link>
        <Link
          href="/remembered"
          className="flex h-16 grow items-center justify-center gap-2 rounded-md border border-gray-300 p-3 text-xl font-medium hover:bg-sky-100 hover:text-blue-600 dark:border-neutral-700"
        >
          Remembered
        </Link>
        <Link
          href="/profile"
          className="flex h-16 grow items-center justify-center gap-2 rounded-md border border-gray-300 p-3 text-xl font-medium hover:bg-sky-100 hover:text-blue-600 dark:border-neutral-700"
        >
          Profile
        </Link>
      </div>
    </main>
  );
}
