'use client';

import { useState, useEffect, useRef, Dispatch, SetStateAction } from 'react';
import Tile from './tile';

interface SquareBoardProps {
  size: number;
  letters: string;
  swiped: Record<string, boolean>;
  setSwiped: Dispatch<SetStateAction<Record<string, boolean>>>;
  validWords: string[][];
  minLength: number;
  onWordClick?: (word: string) => void;
}

export default function SquareBoard({
  size,
  letters,
  swiped,
  setSwiped,
  validWords,
  minLength,
  onWordClick,
}: SquareBoardProps) {
  const boardSize: number = 288;
  const fontSize: number = (boardSize / size) * 0.5;
  const [wordColor, setWordColor] = useState<string>('inherit');
  const [path, setPath] = useState<number[]>([]);
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [activeTiles, setActiveTiles] = useState<boolean[]>(Array(size * size).fill(false));
  const pathRef = useRef<number[]>(path); // Use a ref to keep track of the current path

  useEffect(() => {
    const handleWindowMouseUp = () => {
      handleMouseUp();
    };

    window.addEventListener('mouseup', handleWindowMouseUp);
    window.addEventListener('touchend', handleWindowMouseUp);

    return () => {
      window.removeEventListener('mouseup', handleWindowMouseUp);
      window.removeEventListener('touchend', handleWindowMouseUp);
    };
  }, [isRecording]);

  const isAdjacent = (id1: number, id2: number) => {
    const r1 = (id1 / size) | 0,
      c1 = id1 % size,
      r2 = (id2 / size) | 0,
      c2 = id2 % size;
    return Math.abs(r1 - r2) <= 1 && Math.abs(c1 - c2) <= 1;
  };

  const handleStart = (index: number) => {
    setIsRecording(true);
    const newPath = [index];
    setPath(newPath);
    pathRef.current = newPath;
    setActiveTiles(activeTiles.map((_, idx) => idx === index));
    setWordColor('inherit');
  };

  const handleMove = (index: number) => {
    if (isRecording) {
      const currentPath = pathRef.current;
      const lastId = currentPath.at(-1);

      if (currentPath.length >= 2 && currentPath.at(-2) === index) {
        const nextPath = currentPath.slice(0, -1);
        setPath(nextPath);
        pathRef.current = nextPath;
        setActiveTiles(activeTiles.map((active, idx) => (idx === lastId ? false : active)));
      } else if (lastId !== undefined && isAdjacent(lastId, index)) {
        if (currentPath.includes(index)) return;

        const nextPath = [...currentPath, index];
        setPath(nextPath);
        pathRef.current = nextPath;
        setActiveTiles(activeTiles.map((active, idx) => active || idx === index));
      }
    }
  };

  const handleMouseUp = () => {
    if (isRecording) {
      setIsRecording(false);
      const currentPath = pathRef.current; // Get the most up-to-date path

      // Check the validity of the word
      if (currentPath.length >= minLength) {
        const word = currentPath.map((i) => letters[i]).join('');
        console.log(validWords[word.length])
        if (validWords[word.length]?.includes(word)) {
          if (swiped[word]) setWordColor('yellow');
          else {
            setSwiped((arr) => ({
              ...arr,
              [word]: true,
            }));
            setWordColor('green');
          }
        } else setWordColor('red');
      }
      setActiveTiles(Array(size * size).fill(false));
    }
  };

  const currentWord = path.map((id) => letters[id]).join('');
  const isClickable = wordColor === 'green' || wordColor === 'yellow';

  return (
    <div>
      <div className="flex justify-center items-center h-10 mb-2">
        <div
          style={{
            color: wordColor,
            borderColor: isClickable ? wordColor : 'transparent',
            visibility: currentWord ? 'visible' : 'hidden'
          }}
          className={`px-3 py-0 rounded-full text-xl border-2 transition-all font-bold flex items-center justify-center ${isClickable ? 'cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 shadow-sm' : 'border-transparent'
            }`}
          onClick={() => isClickable && onWordClick?.(currentWord)}
        >
          {currentWord || ' '}
        </div>
      </div>
      <div
        style={{
          width: `${boardSize}px`,
          height: `${boardSize}px`,
          gridTemplateColumns: `repeat(${size}, 1fr)`,
        }}
        className="grid gap-3 mx-auto"
        onMouseUp={handleMouseUp}
        onTouchEnd={handleMouseUp}
      >
        {Array(size * size)
          .fill(null)
          .map((_, id) => (
            <Tile
              key={id}
              id={id}
              letter={letters[id]}
              fontSize={fontSize}
              onStart={handleStart}
              onMove={handleMove}
              isActive={activeTiles[id]}
            />
          ))}
      </div>
    </div>
  );
}
