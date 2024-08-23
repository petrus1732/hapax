"use client";

import Link from "next/link";
import { useBoards } from "../provider";
import { useEffect } from "react";
import { Board } from "../lib/definitions";

interface BoardsClientProps {
  boards: Board[];
}

export default function BoardsClient({ boards }: BoardsClientProps) {
  const { setBoards } = useBoards();
  useEffect(() => {
    setBoards(boards);
  }, [boards, setBoards]);

  return (
    <main className="flex min-h-screen flex-col items-center p-24">
      {boards.map((board, id) => (
        <Link
          key={id}
          href={`/boards/${board.id}`}
          className="w-64 m-2 rounded-md p-2 text-xl font-medium bg-slate-200 dark:bg-zinc-800 hover:bg-sky-100 hover:text-blue-600"
        >
          <h3>{board.boardName}</h3>
          <div className="text-xs">
            author: {board.author} <br />
            size: {board.size} <br />
            date: {board.date}
          </div>
        </Link>
      ))}
    </main>
  );
}
