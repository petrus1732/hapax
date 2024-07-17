import Image from "next/image";
import Link from "next/link";
import "./globals.css";

export default function Home() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-between p-24">
      <div className="grid text-center w-72 mb-0 grid-rows-4 gap-4">
        <Link href='/' className="flex h-16 grow items-center justify-center gap-2 rounded-md bg- p-3 text-xl font-medium border border-gray-300 dark:border-neutral-700 hover:bg-sky-100 hover:text-blue-600">
          Random Board
        </Link>
        <Link href='/create' className="flex h-16 grow items-center justify-center gap-2 rounded-md bg- p-3 text-xl font-medium border border-gray-300 dark:border-neutral-700 hover:bg-sky-100 hover:text-blue-600">
          Create
        </Link>
        <Link href='/' className="flex h-16 grow items-center justify-center gap-2 rounded-md bg- p-3 text-xl font-medium border border-gray-300 dark:border-neutral-700 hover:bg-sky-100 hover:text-blue-600">
          Boards
        </Link>
      </div>
    </main>
  );
}
