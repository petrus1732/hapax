import Tile from "./tile"

export default function SquareBoard({ size } : { size: number }) {
  const letters: string = 'ABCDEFGHIJKLMNOP';
  const boardSize: number = 288;
  const fontSize: number = boardSize / size * 0.8;
  return (
    <div style={{ width: `${boardSize}px`, height: `${boardSize}px` }} className="grid text-center grid-rows-4 grid-cols-4">
      {Array(size*size).fill(null).map((_, id) => (
        <Tile key={id} letter={letters[id]} fontSize={fontSize}/>
      ))}
    </div>
  )
}