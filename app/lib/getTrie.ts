'use server'

import fs from 'fs';
import path from 'path';
import { Trie } from './trie';

export async function getTrie() {
  let trie = new Trie();
  const filePath = path.join(process.cwd(), 'public/CSW2019.txt');
  const words = fs.readFileSync(filePath, 'utf-8').split('\n').map(word => word.trim());

  for (const word of words) {
    trie.insert(word);
  }

  return trie;
}
