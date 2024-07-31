// ./lib/wordFinder.ts
import { Trie, TrieNode } from './trie';

type Board = string[][];

export function findWords(board: Board, trie: Trie): string[] {
  const result: string[] = [];
  const rows = board.length;
  const cols = board[0].length;
  const visited: boolean[][] = Array.from({ length: rows }, () => Array(cols).fill(false));

  const directions = [
    [0, 1], [1, 0], [0, -1], [-1, 0],
    [1, 1], [-1, -1], [1, -1], [-1, 1]
  ];

  function backtrack(row: number, col: number, path: string, node: TrieNode) {
    if (row < 0 || col < 0 || row >= rows || col >= cols || visited[row][col]) return;
    const char = board[row][col];
    if (!node?.children.has(char)) return;

    visited[row][col] = true;
    path += char;
    node = node.children.get(char)!;

    if (node.isEndOfWord) {
      result.push(path);
      node.isEndOfWord = false; // To avoid duplicate words
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

  return result;
}
