import BoardsClient from "./boards-client"; // Import the client component
import { Suspense } from "react";

export default async function BoardsPage() {
  return (
    <main className="flex min-h-screen flex-col items-center p-24">
      <Suspense fallback={<div>Loading boards...</div>}>
        <BoardsClient />
      </Suspense>
    </main>
  );
}
