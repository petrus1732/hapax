'use client';

import InputTile from './input-tile';
import { getWordBlitzBoardMetrics } from './wordblitz-layout';

export default function InputBoard({ size }: { size: number }) {
  const metrics = getWordBlitzBoardMetrics(size);
  const boardSize = metrics.boardSize;
  const fontSize = metrics.tileFontSize;

  return (
    <div>
      <div
        style={{
          width: `${boardSize}px`,
          height: `${boardSize}px`,
          gridTemplateColumns: `repeat(${size}, minmax(0, 1fr))`,
          gridTemplateRows: `repeat(${size}, minmax(0, 1fr))`,
          gap: `${metrics.gridGap}px`,
        }}
        className="mx-auto grid shrink-0"
      >
        {Array(size * size)
          .fill(null)
          .map((_, id) => (
            <InputTile key={id} id={id} fontSize={fontSize} radiusEm={metrics.tileRadiusEm} />
          ))}
      </div>
    </div>
  );
}
