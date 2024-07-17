export default function Tile({ letter, fontSize }: { letter: string, fontSize: number }) {
  return <div style={{fontSize: fontSize + 'px'}} className="rounded-md bg-white text-black row-span-1 m-1 flex justify-center items-center">{letter}</div>
}