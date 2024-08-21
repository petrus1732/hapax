export type User = {
  id: string;
  name: string;
  email: string;
  password: string;
};

export type Board = {
  id: string;
  author: string;
  boardName: string;
  size: number;
  letters: string;
  date: string;
}