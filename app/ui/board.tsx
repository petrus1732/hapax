'use client'

import { useState, useEffect } from 'react';
import Tile from "./tile";

export default function Board({ size, letters }: { size: number, letters: string }) {
  const boardSize: number = 288;
  const fontSize: number = (boardSize / size) * 0.5;

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
      setPath([]);
      // Implement your word validity check here
      setActiveTiles(Array(size * size).fill(false));
    }
  };

  return (
    <div>
      <div className='text-center h-8 text-xl'>{path.map(id => letters[id]).join('')}</div>
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