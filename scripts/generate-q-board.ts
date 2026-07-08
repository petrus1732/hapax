import { Trie } from '../app/lib/trie';
import { findWords } from '../app/lib/find-words';
import dotenv from 'dotenv';
import { sql } from '@vercel/postgres';

dotenv.config({ path: '.env.local' });

async function createBoard(boardName: string, letters: string) {
  const date = new Date().toISOString().split('T')[0];

  // Check if board with the same name already exists
  const existing = await sql`
    SELECT * FROM boards WHERE "boardName" = ${boardName}
  `;

  if (existing.rows.length > 0) {
    console.log(`⚠️ Board "${boardName}" already exists. Skipping.`);
    return;
  }

  try {
    await sql`
      INSERT INTO boards (author, "boardName", size, letters, date, theme, subtheme)
      VALUES ('HaPaX', ${boardName}, 4, ${letters}, ${date}, 'Rare Letters', 'Q')
    `;
    console.log(`✅ Successfully added board "${boardName}"`);
  } catch (error) {
    console.error(`❌ Failed to insert board "${boardName}":`, error);
  }
}

const letterScore: Record<string, number> = {
  A: 1,
  B: 3,
  C: 3,
  D: 2,
  E: 1,
  F: 4,
  G: 2,
  H: 4,
  I: 1,
  J: 8,
  K: 5,
  L: 1,
  M: 3,
  N: 1,
  O: 1,
  P: 3,
  Q: 10,
  R: 1,
  S: 1,
  T: 1,
  U: 1,
  V: 4,
  W: 4,
  X: 10,
  Y: 4,
  Z: 10,
};

const letters = Object.keys(letterScore);
const weights = letters.map((l) => 1 / letterScore[l]);
const totalWeight = weights.reduce((a, b) => a + b, 0);
const probabilities = weights.map((w) => w / totalWeight);

const baseUrl = 'http://localhost:3000';
const getWordlist = async () => {
  const response = await fetch(`${baseUrl}/api/wordlist`);
  if (!response.ok) {
    throw new Error('Failed to get wordlist');
  }
  return response.json();
};
let wordlist: string[] = [];
getWordlist().then(async (response) => {
  wordlist = response.message;
  const sixLetterWordsWithQ = wordlist.filter(
    (word) => word.length === 6 && word.includes('Q') && !word.includes('QU'),
  );
  console.log(`Trying ${sixLetterWordsWithQ.length} Q-words...`);

  const trie = new Trie();
  for (const word of wordlist) {
    trie.insert(word);
  }

  for (const baseWord of sixLetterWordsWithQ) {
    let board: string, words: string[], valid: boolean;
    let attempt = 0;
    const maxAttempts = 100;

    while (attempt++ < maxAttempts) {
      board = generateBoardWithWord(baseWord);
      [words, valid] = findWords(4, board, trie);
      const qWords = words.filter((w) => w.includes('Q'));

      if (valid && qWords.length > 10) {
        console.log(`✅ Success for word: ${baseWord}`);
        for (let i = 0; i < 4; i++) {
          console.log(
            board
              .slice(i * 4, (i + 1) * 4)
              .split('')
              .join(' '),
          );
        }
        createBoard(baseWord, board);
        // const sortedWords = words.sort((a, b) =>
        //   a.length === b.length ? (a < b ? -1 : 1) : (a.length - b.length)
        // );
        // console.log(JSON.stringify(sortedWords));
        break;
      } else {
        console.log(`❌ [${baseWord}] Attempt ${attempt} failed (Q-words: ${qWords.length})`);
        for (let i = 0; i < 4; i++) {
          console.log(
            board
              .slice(i * 4, (i + 1) * 4)
              .split('')
              .join(' '),
          );
        }
      }
    }

    if (attempt >= maxAttempts) {
      console.warn(`⚠️ Skipped ${baseWord} after ${maxAttempts} failed attempts`);
    }
  }
});

function weightedRandomLetter() {
  const rand = Math.random();
  let accum = 0;
  for (let i = 0; i < letters.length; i++) {
    accum += probabilities[i];
    if (rand < accum) return letters[i];
  }
  return letters[letters.length - 1]; // fallback
}

function generateBoardWithWord(word: string): string {
  const size = 4;
  const boardLength = size * size;

  const directions = [
    [-1, -1],
    [-1, 0],
    [-1, 1],
    [0, -1],
    [0, 1],
    [1, -1],
    [1, 0],
    [1, 1],
  ];

  const index = (x: number, y: number) => y * size + x;
  const coords = (i: number): [number, number] => [i % size, Math.floor(i / size)];

  const visited = Array.from({ length: size }, () => Array(size).fill(false));
  let path: [number, number][] = [];

  function dfs(x: number, y: number, depth: number): boolean {
    if (depth === word.length) return true;
    visited[y][x] = true;
    path.push([x, y]);

    const shuffledDirs = directions.sort(() => Math.random() - 0.5);
    for (const [dx, dy] of shuffledDirs) {
      const nx = x + dx;
      const ny = y + dy;
      if (nx >= 0 && nx < size && ny >= 0 && ny < size && !visited[ny][nx]) {
        if (dfs(nx, ny, depth + 1)) return true;
      }
    }

    visited[y][x] = false;
    path.pop();
    return false;
  }

  let success = false;
  for (let attempt = 0; attempt < 100; attempt++) {
    const startX = Math.floor(Math.random() * size);
    const startY = Math.floor(Math.random() * size);
    path = [];
    visited.forEach((row) => row.fill(false));
    if (dfs(startX, startY, 0)) {
      success = true;
      break;
    }
  }

  if (!success) throw new Error('Failed to generate valid path for word');

  const board: (string | null)[] = Array(boardLength).fill(null);
  path.forEach(([x, y], i) => {
    board[index(x, y)] = word[i].toUpperCase();
  });

  // Add U beside Q if needed
  for (let i = 0; i < boardLength; i++) {
    if (board[i] === 'Q') {
      const [x, y] = coords(i);
      let hasU = false;
      const emptyNeighbors: number[] = [];

      for (const [dx, dy] of directions) {
        const nx = x + dx;
        const ny = y + dy;
        if (nx >= 0 && nx < size && ny >= 0 && ny < size) {
          const ni = index(nx, ny);
          if (board[ni] === 'U') {
            hasU = true;
            break;
          } else if (board[ni] === null) {
            emptyNeighbors.push(ni);
          }
        }
      }

      if (!hasU && emptyNeighbors.length > 0) {
        const target = emptyNeighbors[Math.floor(Math.random() * emptyNeighbors.length)];
        board[target] = 'U';
      }
    }
  }

  // Fill the rest randomly
  for (let i = 0; i < boardLength; i++) {
    if (board[i] === null) {
      board[i] = weightedRandomLetter();
    }
  }

  return board.join('');
}

// const generateRandomboard = () => {
//     const size = 4;
//     let letters = '';
//     const vowel = 'AEIOUY';
//     const vowelProp = 0.3;
//     const consanant = "BCDFGHJKLMNPQRSTVWXZ";
//     for (let i = 0; i < size*size; i++) {
//       letters += Math.random() < vowelProp? vowel[Math.floor(Math.random()*vowel.length)] : consanant[Math.floor(Math.random()*consanant.length)];
//     }
//     console.log(`letters: ${letters}`)
//     const randomBoard: Board = {
//       id: 'random id',
//       author: 'Random',
//       boardName: 'random board',
//       size: 4,
//       letters,
//       date: new Date().toISOString().split('T')[0]
//     }
//     console.log(randomBoard)
// }

// generateRandomboard()
