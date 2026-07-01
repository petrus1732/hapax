import fs from 'fs';
import path from 'path';

const inputFile = 'public/Collins Scrabble Words (2019) with definitions.txt';
const outputFile = 'app/lib/dictionary.json';

async function preprocess() {
  console.log('Reading dictionary file...');
  const content = fs.readFileSync(inputFile, 'utf-8');
  const lines = content.split('\n');

  const dictionary = {};
  console.log(`Processing ${lines.length} lines...`);

  for (let i = 1; i < lines.length; i++) {
    // Skip the header line
    const line = lines[i].trim();
    if (!line) continue;

    const [wordPart, definition] = line.split('\t');
    if (!wordPart || !definition) continue;

    // Handle multiple words in the word column (separated by space or comma)
    // based on user note "one line can contain multiple words"
    // Usually these are related forms or synonyms.
    const words = wordPart.split(/[\s,]+/).filter((w) => w.length > 0);

    for (const word of words) {
      const upperWord = word.toUpperCase();
      if (!dictionary[upperWord]) {
        dictionary[upperWord] = definition;
      } else {
        // If word already exists, append new definition if different
        if (!dictionary[upperWord].includes(definition)) {
          dictionary[upperWord] += ' / ' + definition;
        }
      }
    }
  }

  console.log(`Extracted ${Object.keys(dictionary).length} unique words.`);
  console.log('Writing to JSON...');
  fs.writeFileSync(outputFile, JSON.stringify(dictionary));
  console.log('Done!');
}

preprocess().catch(console.error);
