import { Trie, TrieNode } from './trie';

type Board = string[][];

export function findWords(size: number, letters: string, trie: Trie): [string[], boolean] {
  const board: Board = [];
  for (let i = 0; i < size; i++) {
    const row = letters.slice(i * size, (i + 1) * size).split('');
    board.push(row);
  }

  const result: string[] = [];
  const found = new Set<string>();
  const rows = board.length;
  const cols = board[0].length;
  const visited: boolean[][] = Array.from({ length: rows }, () => Array(cols).fill(false));
  const used: boolean[][] = Array.from({ length: rows }, () => Array(cols).fill(false));

  const directions = [
    [0, 1],
    [1, 0],
    [0, -1],
    [-1, 0],
    [1, 1],
    [-1, -1],
    [1, -1],
    [-1, 1],
  ];

  function backtrack(row: number, col: number, path: string, node: TrieNode) {
    if (row < 0 || col < 0 || row >= rows || col >= cols || visited[row][col]) return;

    const char = board[row][col];
    if (!node.children.has(char)) return;

    visited[row][col] = true;
    path += char;
    node = node.children.get(char)!;

    if (node.isEndOfWord && !found.has(path)) {
      result.push(path);
      found.add(path);
      for (let i = 0; i < rows; i++) {
        for (let j = 0; j < cols; j++) {
          if (visited[i][j]) used[i][j] = true;
        }
      }
    }

    for (const [dx, dy] of directions) {
      backtrack(row + dx, col + dy, path, node);
    }

    visited[row][col] = false;
  }

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      backtrack(r, c, '', trie.root);
    }
  }

  const allUsed = used.flat().every((v) => v);
  return [result, allUsed];
}
