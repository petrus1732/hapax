import { describe, expect, it } from 'vitest';
import { findWords } from './find-words';
import { Trie } from './trie';

function buildTrie(words: string[]): Trie {
  const trie = new Trie();
  for (const word of words) trie.insert(word);
  return trie;
}

describe('findWords tile coverage', () => {
  it('marks every route for duplicate words when checking tile coverage', () => {
    const trie = buildTrie(['AA']);
    const [words, allUsed] = findWords(4, 'AAAAAAAAAAAAAAAA', trie, { minCoverageLength: 2 });

    expect(words).toEqual(['AA']);
    expect(allUsed).toBe(true);
  });

  it('can limit coverage to words accepted by the current mode', () => {
    const trie = buildTrie(['ABCD', 'EFGH', 'IJKL', 'MNOP']);
    const board = 'ABCDEFGHIJKLMNOP';

    expect(findWords(4, board, trie, { minCoverageLength: 4 })[1]).toBe(true);
    expect(
      findWords(4, board, trie, {
        minCoverageLength: 4,
        countWordForCoverage: (word) => word !== 'MNOP',
      })[1],
    ).toBe(false);
  });
});
