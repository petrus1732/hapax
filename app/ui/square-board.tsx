'use client';

import { Dispatch, SetStateAction, useEffect, useRef, useState } from 'react';
import Tile from './tile';
import { BonusOrNull, isAdjacent, letterPoints } from '@/app/lib/wordblitz';

export type SubmittedTerm = {
  word: string;
  path: number[];
  isDictionaryWord: boolean;
  isAlreadyFound: boolean;
};

export type SubmitResult = {
  accepted: boolean;
  color?: string;
  keepPath?: boolean;
};

interface SquareBoardProps {
  size: number;
  letters: string;
  swiped: Record<string, boolean>;
  setSwiped: Dispatch<SetStateAction<Record<string, boolean>>>;
  validWords: string[][];
  minLength: number;
  onWordClick?: (word: string) => void;
  onSubmitTerm?: (term: SubmittedTerm) => SubmitResult;
  bonuses?: BonusOrNull[];
  showTileScores?: boolean;
  evolutionLevels?: number[];
  highlightedRoute?: number[];
  disabled?: boolean;
}

export default function SquareBoard({
  size,
  letters,
  swiped,
  setSwiped,
  validWords,
  minLength,
  onWordClick,
  onSubmitTerm,
  bonuses = [],
  showTileScores = false,
  evolutionLevels = [],
  highlightedRoute = [],
  disabled = false,
}: SquareBoardProps) {
  const boardSize = 288;
  const fontSize = (boardSize / size) * 0.5;
  const [wordColor, setWordColor] = useState<string>('inherit');
  const [path, setPath] = useState<number[]>([]);
  const [activeTiles, setActiveTiles] = useState<boolean[]>(Array(size * size).fill(false));
  const pathRef = useRef<number[]>(path);
  const isRecordingRef = useRef(false);

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
  });

  useEffect(() => {
    if (disabled) {
      isRecordingRef.current = false;
      setActiveTiles(Array(size * size).fill(false));
    }
  }, [disabled, size]);

  const handleStart = (index: number) => {
    if (disabled) return;
    isRecordingRef.current = true;
    const newPath = [index];
    setPath(newPath);
    pathRef.current = newPath;
    setActiveTiles(activeTiles.map((_, idx) => idx === index));
    setWordColor('inherit');
  };

  const handleMove = (index: number) => {
    if (!isRecordingRef.current || disabled) return;

    const currentPath = pathRef.current;
    const lastId = currentPath.at(-1);

    if (currentPath.length >= 2 && currentPath.at(-2) === index) {
      const nextPath = currentPath.slice(0, -1);
      setPath(nextPath);
      pathRef.current = nextPath;
      setActiveTiles(activeTiles.map((active, idx) => (idx === lastId ? false : active)));
    } else if (lastId !== undefined && isAdjacent(lastId, index, size)) {
      if (currentPath.includes(index)) return;

      const nextPath = [...currentPath, index];
      setPath(nextPath);
      pathRef.current = nextPath;
      setActiveTiles(activeTiles.map((active, idx) => active || idx === index));
    }
  };

  const handleMouseUp = () => {
    if (!isRecordingRef.current) return;

    isRecordingRef.current = false;
    const currentPath = pathRef.current;

    if (currentPath.length >= minLength) {
      const word = currentPath.map((index) => letters[index]).join('');
      const isDictionaryWord = !!validWords[word.length]?.includes(word);
      const isAlreadyFound = !!swiped[word];

      if (onSubmitTerm) {
        const result = onSubmitTerm({ word, path: currentPath, isDictionaryWord, isAlreadyFound });
        setWordColor(result.color ?? (result.accepted ? 'green' : isDictionaryWord ? 'yellow' : 'red'));
      } else if (isDictionaryWord) {
        if (isAlreadyFound) setWordColor('yellow');
        else {
          setSwiped((arr) => ({ ...arr, [word]: true }));
          setWordColor('green');
        }
      } else {
        setWordColor('red');
      }
    }

    setActiveTiles(Array(size * size).fill(false));
  };

  const currentWord = path.map((id) => letters[id]).join('');
  const isClickable = wordColor === 'green' || wordColor === 'yellow';
  const highlighted = new Set(highlightedRoute);

  return (
    <div>
      <div className="mb-2 flex h-10 items-center justify-center">
        <div
          style={{
            color: wordColor,
            borderColor: isClickable ? wordColor : 'transparent',
            visibility: currentWord ? 'visible' : 'hidden',
          }}
          className={`flex items-center justify-center rounded-full border-2 px-3 py-0 text-xl font-bold transition-all ${
            isClickable
              ? 'cursor-pointer shadow-sm hover:bg-gray-100 dark:hover:bg-gray-800'
              : 'border-transparent'
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
        className="mx-auto grid gap-3"
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
              isRouteHighlighted={highlighted.has(id)}
              bonus={bonuses[id] ?? null}
              points={letterPoints(letters[id])}
              showPoints={showTileScores}
              evolutionLevel={evolutionLevels[id] ?? 0}
              disabled={disabled}
            />
          ))}
      </div>
    </div>
  );
}
