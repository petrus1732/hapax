"use client"

import { Modal } from "flowbite-react";
import SquareBoard from "@/app/ui/square-board";``
import { useBoards } from "@/app/provider";
import { useEffect, useState } from "react";
import { Board } from "@/app/lib/definitions";
import { fetchBoardById } from "@/app/lib/data";
import { findWords } from "@/app/lib/find-words";
import { Trie } from "@/app/lib/trie";

export default function RandomBoardClient() {
  const size = 4
  const { boards } = useBoards(); 
  const [board, setBoard] = useState<Board | null>(null);
  const [openModal, setOpenModal] = useState<boolean>(false);
  const [mask, setMask] = useState<boolean>(true);
  const [wordlist, setWordlist] = useState<string[]>([]);
  const [words, setWords] = useState<string[][]>([]);
  const [wordsLength, setWordsLength] = useState<number>(0);
  const [swiped, setSwiped] = useState<Record<string, boolean>>({});
  const [trie, setTrie] = useState<Trie | null>(null);
  const getWordlist = async () => {
    const response = await fetch('/api/wordlist');
    if (!response.ok) {
      throw new Error('Failed to get wordlist');
    }
    return response.json();
  };
  
  const generateRandomboard = () => {
    let letters = '';
    const vowel = 'AEIOUY';
    const vowelProp = 0.3;
    const consanant = "BCDFGHJKLMNPQRSTVWXZ";
    for (let i = 0; i < size*size; i++) {
      letters += Math.random() < vowelProp? vowel[Math.floor(Math.random()*vowel.length)] : consanant[Math.floor(Math.random()*consanant.length)];
    }
    console.log(`letters: ${letters}`)
    const randomBoard: Board = {
      id: 'random id',
      author: 'Random',
      boardName: 'random board',
      size: 4,
      letters,
      date: new Date().toISOString().split('T')[0]
    } 
    console.log(randomBoard)
    setBoard(randomBoard);
  }

  useEffect(() => {
    console.log('qq')
    generateRandomboard();
    getWordlist()
      .then((response) => {
        setWordlist(response.message);
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

  useEffect(() => {
    if (board && trie) {
      const { size, letters } = board;
      
      const boardArray: string[][] = [];
      for (let i = 0; i < size; i++) {
        const row = letters.slice(i * size, (i + 1) * size).split('');
        boardArray.push(row);
      }
      const ws = findWords(boardArray, trie).sort((a, b) => a.length === b.length? (a < b? -1 : 1) : (a.length - b.length));
      const validWords: string[][] = [];
      ws.forEach(w => {
        if (!validWords[w.length]) validWords[w.length] = [];
        validWords[w.length].push(w)
      });
      setWords(validWords);
      setWordsLength(validWords.flat().length);
    }
  }, [trie, board])

  if (!board) return <div>Loading...</div>; 

  return (
    <main className="flex flex-col items-center">
    {board && wordsLength > 0?
      <div>
        <div onClick={() => setOpenModal(true)} className="p-3 text-6xl text-center">
          {Object.keys(swiped).length}/{words.flat().length}
        </div>
        <Modal 
        className="translate-y-14 h-[calc(100vh-54px)]" 
        style={{maxWidth: '768px', margin: 'auto'}}
        show={openModal} 
        onClose={() => setOpenModal(false)}>
          <Modal.Header className="bg-white dark:bg-black p-2">Words</Modal.Header>
          <Modal.Body className="bg-white dark:bg-black overflow-y-auto" style={{ maxHeight: 'calc(100vh - 54px - 9rem)' }}>
            <div className="m-2">
              <input type="checkbox" id="mask" checked={!mask} onChange={(e) => setMask(!e.target.checked)} />
              <label htmlFor="mask" className="ml-2">reveal letters</label>
            </div>
            {words.map((ws, id) => 
              id > 0 && 
              <div key={id} className="p-2">
                <h3 className="text-orange-500 text-xl">{id} letters</h3>
                <ul className="flex flex-wrap">
                {ws.map((w, idx) => swiped[w]? 
                  <li key={idx} style={{width: 270.4/(270.4/(id*15) | 0) + 'px', color: 'green'}} className="flex-none">{w}</li> :
                  <li key={idx} style={{width: 270.4/(270.4/(id*15) | 0) + 'px'}} className="flex-none">{mask? '*'.repeat(w.length) : w}</li>
                )}
                </ul>
              </div>
            )}
          </Modal.Body>
        </Modal>
  
        <SquareBoard 
          size={board.size} 
          letters={board.letters} 
          swiped={swiped} 
          setSwiped={setSwiped}
          validWords={words}
          minLength={2}
        ></SquareBoard>
      </div> :
      <div>Loading...</div>
    }
    </main>
  )
}