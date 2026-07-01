import RandomBoardClient from './random-board-client';
import { Suspense } from 'react';

export default function Page() {
  return (
    <Suspense fallback={<div className="p-8">Loading practice lab...</div>}>
      <RandomBoardClient />
    </Suspense>
  );
}
