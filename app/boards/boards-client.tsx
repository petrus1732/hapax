"use client";

import Link from "next/link";
import { useBoards } from "../provider";
import { useEffect, useState } from "react";
import { fetchBoards } from "../lib/data";
import { Table } from "flowbite-react";

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
      <h1 className={`mb-8 text-xl md:text-2xl`}>
        Boards
      </h1>
      <div className="mt-6 flow-root">
        <div className="relative max-w-[90vw] overflow-y-auto rounded-md bg-gray-50 dark:bg-zinc-800 md:pt-0" style={{maxHeight: 'calc(100vh - 54px - 15rem)'}}>
          <table className="min-w-full rounded-md table" >
            <thead className="w-full sticky top-0 rounded-md bg-gray-100 dark:bg-zinc-900 text-left text-sm font-normal">
              <tr>
                <th scope="col" className="px-3 py-5 font-medium">
                  Name
                </th>
                <th scope="col" className="px-3 py-5 font-medium">
                  Author
                </th>
                <th scope="col" className="px-3 py-5 font-medium">
                  Date
                </th>
                <th scope="col" className="px-3 py-5 font-medium">
                  
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-200">
              {boards.map((board, id) => (
                <tr key={id} className="group">
                  <td className=" px-2 py-5 text-sm">
                    {board.boardName}
                  </td>
                  <td className="whitespace-nowrap px-2 py-5 text-sm">
                    {board.author}
                  </td>
                  <td className="whitespace-nowrap px-2 py-5 text-sm">
                    {board.date}
                  </td>
                  <td className="whitespace-nowrap px-2 py-5 text-sm">
                    <Link href={`/boards/${board.id}`} className="flex grow items-center justify-center gap-2 rounded-md p-2 text-md font-medium border border-gray-300 dark:border-neutral-700 hover:bg-sky-100 hover:text-blue-600">
                      Play
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
