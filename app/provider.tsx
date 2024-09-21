'use client'
import { createContext, useContext, useState, ReactNode, Dispatch, SetStateAction, useEffect } from "react";
import { ThemeProvider } from "next-themes";
import { SessionProvider } from "next-auth/react";
import { Board } from "./lib/definitions";

type BoardContextType = {
  boards: Board[] | null;
  setBoards: Dispatch<SetStateAction<Board[] | null>>;
  time: number | null;
  setTime: Dispatch<SetStateAction<number | null>>;
};

const BoardContext = createContext<BoardContextType>({
  boards: null,
  setBoards: () => {}, 
  time: null,
  setTime: () => {}
});

export function useBoards() {
  return useContext(BoardContext);
}

export function Providers({ children } : { children: ReactNode}) {
  const [boards, setBoards] = useState<Board[] | null>(null);
  const [time, setTime] = useState<number | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') { 
      const storedTime = localStorage.getItem('time');
      if (storedTime) {
        setTime(Number(storedTime));
      }
    }
  }, []);

  return (
    <SessionProvider>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        <BoardContext.Provider value={{ boards, setBoards, time, setTime }}>
          {children}
        </BoardContext.Provider>
      </ThemeProvider>
    </SessionProvider>
  );
}