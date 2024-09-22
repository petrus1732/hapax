"use client"

import { Modal } from "flowbite-react";
import SquareBoard from "@/app/ui/square-board";``
import { useBoards } from "@/app/provider";
import { useEffect, useState } from "react";
import { Board } from "@/app/lib/definitions";
import { fetchBoardById } from "@/app/lib/data";
import { findWords } from "@/app/lib/find-words";
import { Trie } from "@/app/lib/trie";

export default function BoardClient({ params }: { params: {id: string}}) {
  const { boards, time } = useBoards(); 
  const [timeLeft, setTimeLeft] = useState(time? time : 100);
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
  const [activeTab, setActiveTab] = useState('all words');
  const [countdown, setCountdown] = useState(3); // Start countdown from 3 seconds
  const [veilVisible, setVeilVisible] = useState(true); // Veil visibility state

  // Countdown logic
  useEffect(() => {
    if (time && countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer); // Cleanup timer
    } else {
      setVeilVisible(false); // Hide veil after countdown
    }
  }, [countdown]);

  useEffect(() => {
    if (countdown <= 0 && time && timeLeft > 0) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 0.01), 10); // Decrease time every second
      return () => clearTimeout(timer); // Cleanup timer
    }
  }, [timeLeft, countdown]);

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = ''; // Standard way to trigger the confirmation dialog.
    };
  
    window.addEventListener('beforeunload', handleBeforeUnload);
  
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);

  useEffect(() => {
    const foundBoard = boards? boards.find(b => b.id == params.id) : null;
    if (foundBoard) {
      console.log('board already fetched')
      setBoard(foundBoard);
    } else {
      // Fallback if data isn't already available
      console.log('board has not been fetched')
      const fetchData = async () => {
        try {
          console.log("Finding board " + params.id);
          const fetchedBoard = await fetchBoardById(params.id);
          setBoard(fetchedBoard);
        } catch (error) {
          console.error("Error fetching board:", error);
        }
      };
  
      fetchData(); // Call the async function
    }
  }, [boards, params.id]);

  useEffect(() => {
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

  if (!board) return (
    <div role="status">
        <svg aria-hidden="true" className="w-8 h-8 text-gray-200 animate-spin dark:text-gray-600 fill-blue-600" viewBox="0 0 100 101" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 27.9921 9.08144 50.5908Z" fill="currentColor"/>
            <path d="M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367541 46.6976 0.446843 41.7345 1.27873C39.2613 1.69328 37.813 4.19778 38.4501 6.62326C39.0873 9.04874 41.5694 10.4717 44.0505 10.1071C47.8511 9.54855 51.7191 9.52689 55.5402 10.0491C60.8642 10.7766 65.9928 12.5457 70.6331 15.2552C75.2735 17.9648 79.3347 21.5619 82.5849 25.841C84.9175 28.9121 86.7997 32.2913 88.1811 35.8758C89.083 38.2158 91.5421 39.6781 93.9676 39.0409Z" fill="currentFill"/>
        </svg>
        <span className="sr-only">Loading...</span>
    </div>
  ); 

  return (
    <div className="flex flex-col items-center">
    {veilVisible && (
      <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <span className="text-white text-6xl font-bold">{countdown}</span>
      </div>
    )}
    {/* Time bar at the bottom */}
    {time && timeLeft > 0 &&
      <div className="w-full h-4 bg-gray-300 fixed bottom-0">
        <div
          className="h-full bg-blue-500 transition-all duration-10"
          style={{ width: `${(timeLeft / time) * 100}%` }}
        ></div>
      </div>
    }
    {timeLeft <= 0 && 
    <div className="w-[80vw]">
      <div className="p-3 text-6xl text-center">
        {Object.keys(swiped).length}/{words.flat().length}
      </div>
      {/* Tabs header */}
      <ul
        className="w-full flex flex-wrap text-sm font-medium text-center text-gray-500 border-b border-gray-200 dark:border-gray-700 dark:text-gray-400"
        role="tablist"
      >
        <li className="mr-2">
          <button
            className={`inline-block p-1 rounded-t-lg border-b-2
              ${activeTab === 'all words' ? 'border-blue-500 text-blue-500' : 'border-transparent'}`}
            onClick={() => setActiveTab('all words')}
            role="tab"
            aria-selected={activeTab === 'all words'}
          >
            all words
          </button>
        </li>
        <li className="mr-2">
          <button
            className={`inline-block p-1 rounded-t-lg border-b-2 
              ${activeTab === 'swiped' ? 'border-blue-500 text-blue-500' : 'border-transparent'}`}
            onClick={() => setActiveTab('swiped')}
            role="tab"
            aria-selected={activeTab === 'swiped'}
          >
            swiped
          </button>
        </li>
        <li className="mr-2">
          <button
            className={`inline-block p-1 rounded-t-lg border-b-2 
              ${activeTab === 'unswiped' ? 'border-blue-500 text-blue-500' : 'border-transparent'}`}
            onClick={() => setActiveTab('unswiped')}
            role="tab"
            aria-selected={activeTab === 'unswiped'}
          >
            unswiped
          </button>
        </li>
      </ul>

      {/* Tabs content */}
      <div>
        {activeTab === 'all words' && (
          <div id="all-words" role="tabpanel">
            {words.map((ws, id) => (
              id > 0 && (
                <div key={id} className="p-2">
                  <h3 className="text-orange-500 text-xl">{id} letters</h3>
                  <ul className="flex flex-wrap">
                    {ws.sort().map((w, idx) =>
                      <li
                        key={idx}
                        style={{
                          width: 272 / (272 / (id * 15) | 0) + 'px',
                          color: swiped[w] ? 'inherit' : 'gray'
                        }}
                        className="flex-none"
                      >
                        {w}
                      </li>
                    )}
                  </ul>
                </div>
              )
            ))}
          </div>
        )}

        {activeTab === 'swiped' && (
          <div id="swiped" role="tabpanel">
            {words.map((ws, id) => (
              id > 0 && (
                <div key={id} className="p-2">
                  <h3 className="text-orange-500 text-xl">{id} letters</h3>
                  <ul className="flex flex-wrap">
                    {ws
                      .filter(w => swiped[w])
                      .sort()
                      .map((w, idx) => (
                        <li
                          key={idx}
                          style={{
                            width: 272 / (272 / (id * 15) | 0) + 'px',
                          }}
                          className="flex-none"
                        >
                          {w}
                        </li>
                      ))}
                  </ul>
                </div>
              )
            ))}
          </div>
        )}

        {activeTab === 'unswiped' && (
          <div id="unswiped" role="tabpanel">
            {words.map((ws, id) => (
              id > 0 && (
                <div key={id} className="p-2">
                  <h3 className="text-orange-500 text-xl">{id} letters</h3>
                  <ul className="flex flex-wrap">
                    {ws
                      .filter(w => !swiped[w])
                      .sort()
                      .map((w, idx) => (
                        <li
                          key={idx}
                          style={{
                            width: 272 / (272 / (id * 15) | 0) + 'px',
                          }}
                          className="flex-none"
                        >
                          {w}
                        </li>
                      ))}
                  </ul>
                </div>
              )
            ))}
          </div>
        )}
      </div>
    </div>
    }
    {timeLeft > 0 && board && wordsLength > 0?
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
                  <li key={idx} style={{width: 272/(272/(id*15) | 0) + 'px', color: 'green'}} className="flex-none">{w}</li> :
                  <li key={idx} style={{width: 272/(272/(id*15) | 0) + 'px'}} className="flex-none">{mask? '*'.repeat(w.length) : w}</li>
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
      </div> : <></>
    }
    </div>
  )
}