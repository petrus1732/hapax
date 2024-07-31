'use client'

import { useState, useEffect } from 'react';
import InputTile from "./input-tile";

export default function InputBoard({ size }: { size: number }) {
  const boardSize: number = 288;
  const fontSize: number = (boardSize / size) * 0.5;

  return (
    <div>
      <div
        style={{ width: `${boardSize}px`, height: `${boardSize}px`, gridTemplateColumns: `repeat(${size}, 1fr)` }}
        className="grid gap-1 mx-auto"
      >
        {Array(size * size).fill(null).map((_, id) => (
          <InputTile
            key={id}
            id={id}
            fontSize={fontSize}
          />
        ))}
      </div>
    </div>
  );
}