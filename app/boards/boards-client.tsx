"use client";

import Link from "next/link";
import { useBoards } from "../provider";
import { useEffect, useState } from "react";
import { fetchBoards } from "../lib/data";

export default function BoardsClient() {
  const { boards, setBoards } = useBoards();
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const getBoards = async () => {
      try {
        const data = await fetchBoards();
        setBoards(data);
      } catch (err) {
        setError('Failed to fetch boards');
      } finally {
        setLoading(false);
      }
    };

    getBoards();

  }, []);

  if (loading || !boards) return <div>Loading...</div>;
  if (error) return <div>{error}</div>;

  return (
    <div className="flex flex-col items-center">
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
    </div>
  );
}
