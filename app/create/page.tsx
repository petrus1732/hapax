import SquareBoard from "../ui/square-board";

export default function Create() {
  const size: number = 4;
  
  return(
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <SquareBoard size={size}></SquareBoard>
    </main>
  )
}