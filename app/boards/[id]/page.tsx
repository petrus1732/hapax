import BoardClient from "./board-client";
import { Suspense } from "react";

export default function Page({ params }: { params: {id: string}}) {
  return (
    <main className="flex min-h-screen flex-col items-center p-24">
      <Suspense fallback={<div>Loading boards...</div>}>
        <BoardClient params={params}></BoardClient>
      </Suspense>
    </main>
  )
}