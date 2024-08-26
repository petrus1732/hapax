import RandomBoardClient from "./random-board-client";
import { Suspense } from "react";

export default function Page() {
  return (
    <main className="flex min-h-dvh flex-col items-center p-24">
      <Suspense fallback={<div>Loading boards...</div>}>
        <RandomBoardClient></RandomBoardClient>
      </Suspense>
    </main>
  )
}