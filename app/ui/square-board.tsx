'use client';

import { Dispatch, SetStateAction, useCallback, useEffect, useRef, useState } from 'react';
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
  flashPath?: boolean;
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

const GRID_GAP = 12;

function activeTilesForPath(path: number[], tileCount: number): boolean[] {
  const active = Array(tileCount).fill(false);
  for (const index of path) active[index] = true;
  return active;
}

function routePoints(path: number[], size: number, boardSize: number): string {
  const tileSize = (boardSize - GRID_GAP * (size - 1)) / size;
  return path
    .map((index) => {
      const row = Math.floor(index / size);
      const column = index % size;
      const x = column * (tileSize + GRID_GAP) + tileSize / 2;
      const y = row * (tileSize + GRID_GAP) + tileSize / 2;
      return `${x},${y}`;
    })
    .join(' ');
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
  const tileCount = size * size;
  const [wordColor, setWordColor] = useState<string>('inherit');
  const [path, setPath] = useState<number[]>([]);
  const [activeTiles, setActiveTiles] = useState<boolean[]>(Array(tileCount).fill(false));
  const [flashTiles, setFlashTiles] = useState<boolean[]>(Array(tileCount).fill(false));
  const [isRecording, setIsRecording] = useState(false);
  const pathRef = useRef<number[]>(path);
  const isRecordingRef = useRef(false);
  const flashTimerRef = useRef<number | null>(null);

  const clearActiveTiles = useCallback(() => {
    setActiveTiles(Array(tileCount).fill(false));
  }, [tileCount]);

  const flashCurrentPath = useCallback(
    (currentPath: number[]) => {
      if (flashTimerRef.current !== null) window.clearTimeout(flashTimerRef.current);
      setFlashTiles(activeTilesForPath(currentPath, tileCount));
      flashTimerRef.current = window.setTimeout(() => {
        setFlashTiles(Array(tileCount).fill(false));
        flashTimerRef.current = null;
      }, 167);
    },
    [tileCount],
  );

  const cancelSelection = useCallback(() => {
    isRecordingRef.current = false;
    setIsRecording(false);
    pathRef.current = [];
    setPath([]);
    clearActiveTiles();
  }, [clearActiveTiles]);

  const handleStart = useCallback(
    (index: number) => {
      if (disabled) return;
      isRecordingRef.current = true;
      setIsRecording(true);
      const newPath = [index];
      setPath(newPath);
      pathRef.current = newPath;
      setActiveTiles(activeTilesForPath(newPath, tileCount));
      setWordColor('inherit');
    },
    [disabled, tileCount],
  );

  const handleMove = useCallback(
    (index: number) => {
      if (!isRecordingRef.current || disabled) return;

      const currentPath = pathRef.current;
      const lastId = currentPath.at(-1);
      let nextPath = currentPath;

      if (currentPath.length >= 2 && currentPath.at(-2) === index) {
        nextPath = currentPath.slice(0, -1);
      } else if (lastId !== undefined && isAdjacent(lastId, index, size)) {
        if (currentPath.includes(index)) return;
        nextPath = [...currentPath, index];
      }

      if (nextPath !== currentPath) {
        setPath(nextPath);
        pathRef.current = nextPath;
        setActiveTiles(activeTilesForPath(nextPath, tileCount));
      }
    },
    [disabled, size, tileCount],
  );

  const handleMouseUp = useCallback(() => {
    if (!isRecordingRef.current) return;

    isRecordingRef.current = false;
    setIsRecording(false);
    const currentPath = pathRef.current;
    clearActiveTiles();

    if (currentPath.length >= minLength) {
      const word = currentPath.map((index) => letters[index]).join('');
      const isDictionaryWord = !!validWords[word.length]?.includes(word);
      const isAlreadyFound = !!swiped[word];

      if (onSubmitTerm) {
        const result = onSubmitTerm({ word, path: currentPath, isDictionaryWord, isAlreadyFound });
        if (result.flashPath) flashCurrentPath(currentPath);
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
  }, [clearActiveTiles, flashCurrentPath, letters, minLength, onSubmitTerm, setSwiped, swiped, validWords]);

  useEffect(() => {
    const finishSelection = () => handleMouseUp();
    const cancelCurrentSelection = () => cancelSelection();

    window.addEventListener('mouseup', finishSelection);
    window.addEventListener('touchend', finishSelection);
    window.addEventListener('pointerup', finishSelection);
    window.addEventListener('touchcancel', cancelCurrentSelection);
    window.addEventListener('pointercancel', cancelCurrentSelection);
    window.addEventListener('blur', cancelCurrentSelection);

    return () => {
      window.removeEventListener('mouseup', finishSelection);
      window.removeEventListener('touchend', finishSelection);
      window.removeEventListener('pointerup', finishSelection);
      window.removeEventListener('touchcancel', cancelCurrentSelection);
      window.removeEventListener('pointercancel', cancelCurrentSelection);
      window.removeEventListener('blur', cancelCurrentSelection);
    };
  }, [cancelSelection, handleMouseUp]);

  useEffect(() => {
    if (disabled) cancelSelection();
  }, [cancelSelection, disabled]);

  useEffect(() => {
    return () => {
      if (flashTimerRef.current !== null) window.clearTimeout(flashTimerRef.current);
    };
  }, []);

  useEffect(() => {
    setActiveTiles((current) => (current.length === tileCount ? current : Array(tileCount).fill(false)));
    setFlashTiles((current) => (current.length === tileCount ? current : Array(tileCount).fill(false)));
  }, [tileCount]);

  const currentWord = path.map((id) => letters[id]).join('');
  const isClickable = wordColor === 'green' || wordColor === 'yellow';
  const routePath = isRecording ? path : highlightedRoute;
  const highlighted = new Set(isRecording ? [] : highlightedRoute);
  const routePolylinePoints = routePath.length >= 2 ? routePoints(routePath, size, boardSize) : '';

  return (
    <div className="wb-square-board">
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
          gridTemplateColumns: `repeat(${size}, minmax(0, 1fr))`,
          gridTemplateRows: `repeat(${size}, minmax(0, 1fr))`,
        }}
        className="wb-board-grid relative isolate mx-auto grid shrink-0 gap-3"
        onMouseUp={handleMouseUp}
        onTouchEnd={handleMouseUp}
      >
        {routePolylinePoints && (
          <svg
            aria-hidden="true"
            className="wb-route-overlay absolute inset-0"
            width={boardSize}
            height={boardSize}
            viewBox={`0 0 ${boardSize} ${boardSize}`}
          >
            <polyline
              className={
                isRecording ? 'wb-route-line wb-route-line-active' : 'wb-route-line wb-route-line-selected'
              }
              points={routePolylinePoints}
            />
          </svg>
        )}
        {Array(tileCount)
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
              isRouteFlashing={flashTiles[id]}
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
