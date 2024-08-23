import { fetchBoards } from "../lib/data";
import BoardsClient from "./BoardsClient"; // Import the client component

export default async function BoardsPage() {
  const boards = await fetchBoards(); // Fetch data on the server side
  return <BoardsClient boards={boards} />;
}
