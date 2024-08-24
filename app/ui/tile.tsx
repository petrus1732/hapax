import { useEffect, useRef } from 'react';

interface TileProps {
  id: number;
  letter: string;
  fontSize: number;
  onStart: (index: number) => void;
  onMove: (index: number) => void;
  isActive: boolean;
}

export default function Tile({ id, letter, fontSize, onStart, onMove, isActive }: TileProps): JSX.Element {
  const tileRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const tileElement = tileRef.current;

    const handleTouchStart = (e: TouchEvent) => {
      e.preventDefault(); // Prevent scrolling
      onStart(id);
    };

    const handleTouchMove = (e: TouchEvent) => {
      e.preventDefault(); // Prevent scrolling
      const touch = e.touches[0];
      const target = document.elementFromPoint(touch.clientX, touch.clientY);
      if (target && target instanceof HTMLElement && target.dataset.tileId) {
        const targetId = parseInt(target.dataset.tileId, 10);
        onMove(targetId);
      }
    };

    // Add touch event listeners with { passive: false }.
    tileElement?.addEventListener('touchstart', handleTouchStart, { passive: false });
    tileElement?.addEventListener('touchmove', handleTouchMove, { passive: false });

    return () => {
      // Clean up event listeners.
      tileElement?.removeEventListener('touchstart', handleTouchStart);
      tileElement?.removeEventListener('touchmove', handleTouchMove);
    };
  }, [id, onStart, onMove]);

  return (
    <div
      ref={tileRef}
      data-tile-id={id}
      style={{
        fontSize: `${fontSize}px`,
        backgroundColor: isActive ? 'darkblue' : 'white',
        color: isActive ? 'white' : 'black',
      }}
      className="select-none rounded-md flex justify-center items-center w-full h-full"
      onMouseDown={() => onStart(id)}
      onMouseEnter={() => onMove(id)}
    >
      {letter}
    </div>
  );
}
