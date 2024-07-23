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
      style={{ fontSize: fontSize + 'px', backgroundColor: isActive ? 'darkblue' : 'white', color: isActive ? 'white' : 'black' }}
      className="select-none rounded-md row-span-1 m-1 flex justify-center items-center"
      onMouseDown={() => onMouseDown(id)}
      onMouseEnter={() => onMouseEnter(id)}
    >
      {letter}
    </div>
  );
}