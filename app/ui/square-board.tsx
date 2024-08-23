'use client'

import { useState, useEffect, Dispatch, SetStateAction } from 'react';
import Tile from "./tile";

interface SquareBoardProps {
  size: number;
  letters: string;
  swiped: Record<string, boolean>;
  setSwiped: Dispatch<SetStateAction<Record<string, boolean>>>;
  validWords: string[][];
  minLength: number;
}

export default function SquareBoard({ size, letters, swiped, setSwiped, validWords, minLength }: 
SquareBoardProps) {
  const boardSize: number = 288;
  const fontSize: number = (boardSize / size) * 0.5;
  const [wordColor, setWordColor] = useState<string>('white');
  const [path, setPath] = useState<number[]>([]);
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [activeTiles, setActiveTiles] = useState<boolean[]>(Array(size * size).fill(false));
  
  useEffect(() => {
    const handleWindowMouseUp = () => {
      if (isRecording) handleMouseUp();
    };

    window.addEventListener('mouseup', handleWindowMouseUp);

    return () => window.removeEventListener('mouseup', handleWindowMouseUp);
  }, [isRecording]);

  const isAdjacent = (id1: number, id2: number) => {
    const r1 = id1/size|0, c1 = id1%size, r2 = id2/size|0, c2 = id2%size;
    return Math.abs(r1-r2) <= 1 && Math.abs(c1-c2) <= 1;
  }

  const handleMouseDown = (index: number) => {
    setIsRecording(true);
    setPath([index]);
    setActiveTiles(activeTiles.map((_, idx) => idx === index));
    setWordColor('white');
  };

  const handleMouseEnter = (index: number) => {
    if (isRecording) {
      const lastId = path.at(-1);
      
      if (path.length >= 2 && path.at(-2) === index) {
        setPath(path => path.slice(0, -1));
        setActiveTiles(activeTiles.map((active, idx) => idx === lastId? false : active));
      } else if (lastId != undefined && isAdjacent(lastId, index)) {
        const pathLength = path.length;
        for (let i = 0; i < pathLength; i++) {
          if (path[i] === index) return;
        }
        setPath(path => [...path, index]);
        setActiveTiles(activeTiles.map((active, idx) => active || idx === index));
      }
    }
  };

  const handleMouseUp = () => {
    if (isRecording) {
      setIsRecording(false);
      // Check the validity of the word
      if (path.length >= minLength) {
        const word = path.map(i => letters[i]).join('');
        if (validWords[word.length].includes(word)) {
          if (swiped[word]) setWordColor('yellow');
          else {
            setSwiped(arr => ({
              ...arr,
              [word]: true
            }))
            setWordColor('green');
          }
        } else setWordColor('red');
      }
      setActiveTiles(Array(size * size).fill(false));
    }
  };

  return (
    <div>
      <div style={{color: wordColor}} className='text-center h-8 text-xl'>
        {path.map(id => letters[id]).join('')}
      </div>
      <div
        style={{ width: `${boardSize}px`, height: `${boardSize}px`, gridTemplateColumns: `repeat(${size}, 1fr)` }}
        className="grid gap-1 mx-auto"
        onMouseUp={handleMouseUp}
      >
        {Array(size * size).fill(null).map((_, id) => (
          <Tile
            key={id}
            id={id}
            letter={letters[id]}
            fontSize={fontSize}
            onMouseDown={() => handleMouseDown(id)}
            onMouseEnter={() => handleMouseEnter(id)}
            isActive={activeTiles[id]}
          />
        ))}
      </div>
    </div>
  );
}