'use client'

interface TileProps {
  id: number;
  letter: string;
  fontSize: number;
  onMouseDown: (index: number) => void;
  onMouseEnter: (index: number) => void;
  isActive: boolean;
}

export default function Tile({ id, letter, fontSize, onMouseDown, onMouseEnter, isActive }: TileProps): JSX.Element {
  return (
    <div
      style={{ fontSize: `${fontSize}px`, backgroundColor: isActive ? 'darkblue' : 'white', color: isActive ? 'white' : 'black' }}
      className="select-none rounded-md flex justify-center items-center w-full h-full"
      onMouseDown={() => onMouseDown(id)}
      onMouseEnter={() => onMouseEnter(id)}
    >
      {letter}
    </div>
  );
}