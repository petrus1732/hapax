'use client';

import InputBoard from "../ui/input-board";
import { Button } from "../ui/button";
import { State } from "../lib/actions";
import { useFormState } from 'react-dom';
import { createBoard } from "../lib/actions";
import { useState, useEffect } from "react";
import { findWords } from "../lib/find-words";
import { Trie } from "../lib/trie";
import { useSession } from "next-auth/react"

export default function Create() {
  
  const boardSizes = [3,4,5,6,7,8,9,10];
  const [size, setSize] = useState<number|null>(null);
  const initialState: State = { message: '', errors: {} };
  const [state, formAction] = useFormState(createBoard, initialState);
  const [wordlist, setWordlist] = useState<string[]>([]);
  const [words, setWords] = useState<string[][]>([]);
  const [trie, setTrie] = useState<Trie | null>(null);
  const { data: session, status } = useSession();

  const getWordlist = async () => {
    const response = await fetch('/api/wordlist');
    if (!response.ok) {
      throw new Error('Failed to get wordlist');
    }
    return response.json();
  };
  
  useEffect(() => {
    getWordlist()
      .then((response) => {
        setWordlist(response.message.split(/\r?\n/));
  })
      .catch(console.error);
  }, []);

  useEffect(() => {
    if (wordlist.length!== 0 && !trie) {
      let newTrie = new Trie();
      for (const word of wordlist) {
        newTrie.insert(word);
      }
      setTrie(newTrie);
    }    
  }, [wordlist]);

  useEffect(() => console.log(trie, wordlist), [trie])

  const handleFindWords =  (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    if (!trie) return;
    const form = event.currentTarget.closest('form');
    if (form && size) {
      const formData = new FormData(form);
      const letters = Array(size*size).fill(null).map((_, id) => formData.get(`letter${id}`)).join('').toUpperCase()
      if (/^[A-Z]+$/.test(letters) && letters.length === size*size) {
        const board: string[][] = [];
        for (let i = 0; i < size; i++) {
          const row = letters.slice(i * size, (i + 1) * size).split('');
          board.push(row);
        }
        const ws = findWords(board, trie).sort((a, b) => a.length === b.length? (a < b? -1 : 1) : (a.length - b.length));
        const validWords: string[][] = [];
        ws.forEach(w => {
          if (!validWords[w.length]) validWords[w.length] = [];
          validWords[w.length].push(w)
        });
        setWords(validWords);
      }
    }
  };

  return(
    <main className="flex min-h-screen flex-col items-center p-24">
      <form action={formAction} className="mb-4">
        <div className="mb-4 w-72">
          {session?.user? "" : "Log in to store your board!"}
        </div>
        <div className="mb-4 w-72">
          <label htmlFor="boardSize" className="mb-2 block text-sm font-medium">
            Board name (optional)
          </label>
          <div className="relative">
            <input 
              id="boardName"
              name="boardName"
              className="peer block w-full cursor-pointer rounded-md border border-gray-200 py-2 pl-2 text-sm outline-2 placeholder:text-gray-500"
              defaultValue=""
              aria-describedby="board-name-error">
            </input>
          </div>
          <div id="board-name-error" aria-live="polite" aria-atomic="true">
            {state.errors?.boardName &&
              state.errors.boardName.map((error: string) => (
                <p className="mt-2 text-sm text-red-500" key={error}>
                  {error}
                </p>
              ))}
          </div>
        </div>
        <div className="mb-4 w-72">
          <label htmlFor="boardSize" className="mb-2 block text-sm font-medium">
            Select board size (3~10)
          </label>
          <div className="relative">
            <select
              id="boardSize"
              name="boardSize"
              className="peer block w-full cursor-pointer rounded-md border border-gray-200 py-2 pl-2 text-sm outline-2 placeholder:text-gray-500"
              defaultValue=""
              aria-describedby="size-error"
              onChange={e => setSize(Number(e.target.value))}
            >
              <option value="" disabled>
                Board Size
              </option>
              {boardSizes.map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </div>
          <div id="size-error" aria-live="polite" aria-atomic="true">
            {state.errors?.size &&
              state.errors.size.map((error: string) => (
                <p className="mt-2 text-sm text-red-500" key={error}>
                  {error}
                </p>
              ))}
          </div>
        </div>
        {size &&
        <>
          <div className="mb-4">
            <label className="mb-2 block text-sm font-medium">
              Enter letters
            </label>
            <InputBoard size={size}></InputBoard>
            <div id="letters-error" aria-live="polite" aria-atomic="true">
              {state.errors?.letters &&
                state.errors.letters.map((error: string) => (
                  <p className="mt-2 text-sm text-red-500" key={error}>
                    {error}
                  </p>
                ))
              }
            </div>
          </div>
          <div className="flex justify-between">
            <Button onClick={handleFindWords}>Find Words</Button>
            <Button type="submit">Create Board</Button>
          </div>  
        </>
        }
        
        <div id="status-error" aria-live="polite" aria-atomic="true">
          {(state.message) &&
            <p className="mt-2 text-sm text-red-500" key={state.message}>
              {state.message}
            </p>
          }
        </div>
      </form>
      {words.length !== 0 &&
        <div className="w-72 border rounded-lg border-solid border-white">
          {words.map((ws, id) => 
          id > 0 && 
          <section key={id} className="p-2">
            <h3 className="text-orange-500 text-xl">{id} letters</h3>
            <ul className="flex flex-wrap">
            {ws.map((w, idx) => <li key={idx} style={{width: 270.4/(270.4/(id*15) | 0) + 'px'}} className="flex-none">{w}</li>)}
            </ul>
          </section>
          )}
        </div>
      }
    </main>
  )
}