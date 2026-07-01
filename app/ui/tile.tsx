import { useEffect, useRef } from 'react';
import { BonusOrNull, bonusLabel } from '@/app/lib/wordblitz';

interface TileProps {
  id: number;
  letter: string;
  fontSize: number;
  onStart: (index: number) => void;
  onMove: (index: number) => void;
  isActive: boolean;
  isRouteHighlighted?: boolean;
  bonus?: BonusOrNull;
  points?: number;
  showPoints?: boolean;
  evolutionLevel?: number;
  disabled?: boolean;
}

function bonusFrameClass(bonus?: BonusOrNull): string {
  switch (bonus) {
    case 'dw':
      return 'wb-tile-2w';
    case 'tw':
      return 'wb-tile-3w';
    case 'qw':
      return 'wb-tile-4w';
    case 'dl':
      return 'wb-tile-2l';
    case 'tl':
      return 'wb-tile-3l';
    case 'ql':
      return 'wb-tile-4l';
    default:
      return '';
  }
}

export default function Tile({
  id,
  letter,
  fontSize,
  onStart,
  onMove,
  isActive,
  isRouteHighlighted = false,
  bonus = null,
  points = 1,
  showPoints = false,
  evolutionLevel = 0,
  disabled = false,
}: TileProps): JSX.Element {
  const tileRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const tileElement = tileRef.current;

    const handleTouchStart = (event: TouchEvent) => {
      if (disabled) return;
      event.preventDefault();
      onStart(id);
    };

    const handleTouchMove = (event: TouchEvent) => {
      if (disabled) return;
      event.preventDefault();
      const touch = event.touches[0];
      const target = document.elementFromPoint(touch.clientX, touch.clientY);
      if (target && target instanceof HTMLElement && target.dataset.tileId) {
        const targetId = parseInt(target.dataset.tileId, 10);
        onMove(targetId);
      }
    };

    tileElement?.addEventListener('touchstart', handleTouchStart, { passive: false });
    tileElement?.addEventListener('touchmove', handleTouchMove, { passive: false });

    return () => {
      tileElement?.removeEventListener('touchstart', handleTouchStart);
      tileElement?.removeEventListener('touchmove', handleTouchMove);
    };
  }, [disabled, id, onStart, onMove]);

  const className = [
    'wb-tile relative select-none rounded-md flex justify-center items-center w-full h-full shadow-sm transition-all',
    bonusFrameClass(bonus),
    isActive ? 'wb-tile-active' : '',
    isRouteHighlighted && !isActive ? 'wb-tile-route' : '',
    evolutionLevel >= 3 && !isActive ? 'wb-tile-evolution-max' : '',
    disabled ? 'cursor-default' : 'cursor-pointer',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div
      ref={tileRef}
      data-tile-id={id}
      style={{ fontSize: `${fontSize}px` }}
      className={className}
      onMouseDown={() => !disabled && onStart(id)}
      onMouseEnter={() => !disabled && onMove(id)}
    >
      {bonus && <span className={`wb-bonus-dot wb-bonus-${bonus}`}>{bonusLabel(bonus)}</span>}
      {showPoints && <span className="wb-tile-points">{points}</span>}
      {evolutionLevel > 0 && <span className="wb-evolution-level">Lv.{evolutionLevel}</span>}
      <span className="wb-tile-letter">{letter}</span>
    </div>
  );
}
