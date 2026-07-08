import RememberedBoardsClient from './remembered-boards-client';

export default function RememberedBoardsPage() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-6xl flex-col items-center gap-6 px-4 py-8">
      <RememberedBoardsClient />
    </main>
  );
}
