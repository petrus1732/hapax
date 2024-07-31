'use client'

interface TileProps {
  id: number;
  fontSize: number;
}

export default function InputTile({ id, fontSize }: TileProps): JSX.Element {
  return (
    <input
      id={`letter${id}`}
      name={`letter${id}`}
      style={{ fontSize: `${fontSize}px` }}
      className="uppercase select-none bg-white text-black rounded-md w-full h-full text-center leading-none"
      maxLength={1}
      autoComplete="off"
    >
    </input>
  );
}