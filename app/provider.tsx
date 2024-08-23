'use client'
import { createContext, useContext, useState, ReactNode, Dispatch, SetStateAction } from "react";
import { ThemeProvider } from "next-themes";
import { SessionProvider } from "next-auth/react";
import { Board } from "./lib/definitions";

type BoardContextType = {
  boards: Board[] | null;
  setBoards: Dispatch<SetStateAction<Board[] | null>>;
};

const BoardContext = createContext<BoardContextType>({
  boards: null,
  setBoards: () => {}, // A no-op function as a default placeholder
});

export function useBoards() {
  return useContext(BoardContext);
}

export function Providers({ children } : { children: ReactNode}) {
  const [boards, setBoards] = useState<Board[] | null>(null);

  return (
    <SessionProvider>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        <BoardContext.Provider value={{ boards, setBoards }}>
          {children}
        </BoardContext.Provider>
      </ThemeProvider>
    </SessionProvider> 
  )
}