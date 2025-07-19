"use client";

import { useBoards } from "../provider";
import { useEffect, useState } from "react";
import { fetchBoards } from "../lib/data";
import { useRouter } from "next/navigation";

const timeOptions = ['∞', '90', '80', '70', '60'];

export default function BoardsClient() {
  const router = useRouter();
  const { boards, setBoards, time, setTime } = useBoards();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTheme, setSelectedTheme] = useState<string | null>(null);
  const [selectedSubtheme, setSelectedSubtheme] = useState<string | null>(null);

  useEffect(() => {
    const getBoards = async () => {
      try {
        const data = await fetchBoards();
        setBoards(data);
      } catch {
        setError("Failed to fetch boards");
      } finally {
        setLoading(false);
      }
    };
    getBoards();
  }, []);
  
  useEffect(() => {
    if (time) localStorage.setItem("time", String(time));
    else localStorage.removeItem("time");
  }, [time]);

  if (loading || !boards) return <div>Loading...</div>;
  if (error) return <div>{error}</div>;

  // Organize boards by theme and subtheme
  const themes: Record<string, Record<string, typeof boards>> = {};
  const userBoards: typeof boards = [];
  for (const board of boards) {
    if (board.theme && board.subtheme) {
      if (!themes[board.theme]) themes[board.theme] = {};
      if (!themes[board.theme][board.subtheme]) themes[board.theme][board.subtheme] = [];
      themes[board.theme][board.subtheme].push(board);
    } else {
      userBoards.push(board);
    }
  }

  const filteredBoards =
    selectedTheme && selectedSubtheme
      ? themes[selectedTheme][selectedSubtheme]
      : selectedTheme
        ? Object.values(themes[selectedTheme]).flat()
        : userBoards;


  return (
    <div className="flex flex-col items-center">
      <h1 className="mt-20 mb-8 text-xl md:text-3xl">Boards</h1>

      {/* Time Selector */}
      <div className="w-72">
        <label htmlFor="boardSize" className="mb-2 block text-sm font-medium">
          Select time limit
        </label>
        <select
          id="boardSize"
          name="boardSize"
          className="peer block w-full cursor-pointer rounded-md border border-gray-200 py-2 pl-2 text-sm outline-2 placeholder:text-gray-500 dark:bg-black"
          defaultValue={time ? time : '∞'}
          onChange={e => setTime(e.target.value === '∞' ? null : Number(e.target.value))}
        >
          <option value="" disabled>Time limit</option>
          {timeOptions.map((time) => (
            <option key={time} value={time}>{time}</option>
          ))}
        </select>
      </div>

      {/* Theme Tabs */}
      <div className="flex gap-2 mt-6 overflow-x-auto max-w-[90vw]">
        <button
          className={`px-4 py-2 rounded-full text-sm ${selectedTheme === null ? 'bg-blue-500 text-white' : 'bg-gray-200 dark:bg-zinc-700'}`}
          onClick={() => {
            setSelectedTheme(null);
            setSelectedSubtheme(null);
          }}
        >
          User Boards
        </button>
        {Object.keys(themes).map((theme) => (
          <button
            key={theme}
            className={`px-4 py-2 rounded-full text-sm ${selectedTheme === theme ? 'bg-blue-500 text-white' : 'bg-gray-200 dark:bg-zinc-700'}`}
            onClick={() => {
              setSelectedTheme(theme);
              setSelectedSubtheme(null);
            }}
          >
            {theme}
          </button>
        ))}
      </div>

      {/* Subtheme Buttons */}
      {selectedTheme && (
        <div className="flex flex-wrap justify-center gap-2 mt-4 max-w-[90vw]">
          {Object.keys(themes[selectedTheme]).map(sub => (
            <button
              key={sub}
              className={`px-3 py-1 text-sm rounded ${selectedSubtheme === sub ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-zinc-700'}`}
              onClick={() => setSelectedSubtheme(sub)}
            >
              {sub}
            </button>
          ))}
        </div>
      )}

      {/* Board List */}
      <div className="mt-6 flow-root">
        <div className="relative max-w-[90vw] overflow-y-auto rounded-md bg-gray-50 dark:bg-zinc-800 md:pt-0" style={{ maxHeight: 'calc(100vh - 54px - 20rem)' }}>
          <table className="min-w-full rounded-md table">
            <thead className="w-full sticky top-0 rounded-md bg-gray-100 dark:bg-zinc-900 text-left text-sm font-normal">
              <tr>
                <th scope="col" className="px-3 py-5 font-medium">Name</th>
                <th scope="col" className="px-3 py-5 font-medium">Author</th>
                <th scope="col" className="px-3 py-5 font-medium">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredBoards.map((board, id) => (
                <tr key={id} className="group cursor-pointer" onClick={() => router.push(`/boards/${board.id}`)}>
                  <td className="px-2 py-5 text-sm">
                    <div>{board.boardName}</div>
                    {board.theme && board.subtheme && (
                      <div className="text-xs text-blue-500">{board.theme} - {board.subtheme}</div>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-2 py-5 text-sm">{board.author}</td>
                  <td className="whitespace-nowrap px-2 py-5 text-sm">{board.date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
