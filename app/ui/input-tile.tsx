'use client';

interface TileProps {
  id: number;
  fontSize: number;
  radiusEm?: number;
}

export default function InputTile({ id, fontSize, radiusEm = 0.42 }: TileProps): JSX.Element {
  return (
    <input
      id={`letter${id}`}
      name={`letter${id}`}
      style={{ fontSize: `${fontSize}px`, borderRadius: `${radiusEm}em` }}
      className="h-full w-full select-none bg-white text-center uppercase leading-none text-black"
      maxLength={1}
      autoComplete="off"
    ></input>
  );
}
