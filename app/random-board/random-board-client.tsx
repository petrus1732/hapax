'use client';

import SquareBoard, { SubmittedTerm, SubmitResult } from '@/app/ui/square-board';
import { Board } from '@/app/lib/definitions';
import { findWords } from '@/app/lib/find-words';
import { Trie } from '@/app/lib/trie';
import {
  BLITZ_SECONDS,
  BOARD_SIZE,
  BonusOrNull,
  PracticeMode,
  ROUND_SECONDS,
  RoundMode,
  TRAINING_LETTERS,
  TrainingLetter,
  bestRouteForWord,
  calculatePathScore,
  countBonuses,
  formatRoute,
  generateBonuses,
  generateTrainingBoard,
  groupWordsByLength,
  randomBoardLetters,
} from '@/app/lib/wordblitz';
import { useCallback, useEffect, useMemo, useState } from 'react';

type ArenaSubmode = 'arena-gladiator' | 'arena-tight-rope' | 'arena-8-plus-superior';

type FoundWord = {
  word: string;
  path: number[];
  score: number;
  inspired?: boolean;
};

const MAIN_MODES: Array<{ id: PracticeMode | 'custom-arena'; label: string; description: string }> = [
  { id: 'practice', label: 'practice', description: 'No score and no multipliers.' },
  { id: 'normal', label: 'e0 normal', description: 'R1/R2/R3 Word Blitz-style scoring.' },
  { id: 'inspiration', label: 'e1 inspiration', description: 'Earn one hint per 5 manually found words.' },
  {
    id: 'length-bonus-5-plus',
    label: 'e2 5+ bonus',
    description: '+50 for each valid word with length at least 5.',
  },
  { id: 'blitz', label: 'e3 blitz', description: '30 seconds; each accepted word adds 1 second.' },
  {
    id: 'long-words-only-4-plus',
    label: 'e4 4+ words',
    description: 'Only words of length 4 or more count.',
  },
  { id: 'quadruple-bonus', label: 'e5 quadruple bonus', description: 'R4 board with 4W and 4L tiles.' },
  { id: 'evolution', label: 'e6 evolution', description: 'Tiles level up to +5, +10, and +50.' },
  {
    id: 'custom-arena',
    label: 'custom arena',
    description: 'FB group rules: gladiator, tight rope, and 8+ superior.',
  },
  { id: 'training', label: 'training mode', description: 'Rare-letter Q/X/Z/J board practice.' },
];

const ROUND_CHOICES: Array<{ id: RoundMode; label: string; description: string }> = [
  { id: 'r1', label: 'R1', description: '1×3L + 2×2L' },
  { id: 'r2', label: 'R2', description: '2×2W + 1×2L + 1×3L' },
  { id: 'r3', label: 'R3', description: '1×3W + 2×2W + 2×3L + 2×2L' },
];

const ARENA_CHOICES: Array<{ id: ArenaSubmode; label: string; description: string }> = [
  {
    id: 'arena-gladiator',
    label: 'f1 gladiator',
    description: 'Only length 5+ words count; valid shorter words are penalties.',
  },
  {
    id: 'arena-tight-rope',
    label: 'f2 tight rope',
    description: 'Only length exactly 4 counts; other valid lengths are penalties.',
  },
  {
    id: 'arena-8-plus-superior',
    label: 'f3 8+ superior',
    description: 'Normal play; length 8+ words earn kudos.',
  },
];

function isRoundMode(mode: PracticeMode): boolean {
  return [
    'normal',
    'inspiration',
    'length-bonus-5-plus',
    'blitz',
    'long-words-only-4-plus',
    'arena-gladiator',
    'arena-tight-rope',
    'arena-8-plus-superior',
    'training',
  ].includes(mode);
}

function modeTitle(mode: PracticeMode): string {
  return MAIN_MODES.find((candidate) => candidate.id === mode)?.label ?? mode;
}

function scoreEvolutionLevel(level: number): number {
  if (level <= 0) return 0;
  if (level === 1) return 5;
  if (level === 2) return 10;
  return 50;
}

function formatTime(value: number): string {
  if (value <= 0) return '0.0';
  return value.toFixed(1);
}

export default function RandomBoardClient() {
  const [mode, setMode] = useState<PracticeMode>('practice');
  const [arenaMode, setArenaMode] = useState<ArenaSubmode>('arena-gladiator');
  const [roundMode, setRoundMode] = useState<RoundMode>('r1');
  const [trainingLetter, setTrainingLetter] = useState<TrainingLetter>('Q');
  const [board, setBoard] = useState<Board | null>(null);
  const [bonuses, setBonuses] = useState<BonusOrNull[]>(Array(BOARD_SIZE * BOARD_SIZE).fill(null));
  const [wordlist, setWordlist] = useState<string[]>([]);
  const [trie, setTrie] = useState<Trie | null>(null);
  const [words, setWords] = useState<string[][]>([]);
  const [swiped, setSwiped] = useState<Record<string, boolean>>({});
  const [foundWords, setFoundWords] = useState<Record<string, FoundWord>>({});
  const [manualAcceptedCount, setManualAcceptedCount] = useState(0);
  const [hintsUsed, setHintsUsed] = useState(0);
  const [penalties, setPenalties] = useState(0);
  const [kudos, setKudos] = useState(0);
  const [evolutionLevels, setEvolutionLevels] = useState<number[]>(Array(BOARD_SIZE * BOARD_SIZE).fill(0));
  const [timeLeft, setTimeLeft] = useState(0);
  const [finished, setFinished] = useState(false);
  const [openWordList, setOpenWordList] = useState(false);
  const [mask, setMask] = useState(true);
  const [statusMessage, setStatusMessage] = useState('Choose a mode, then start a board.');
  const [highlightedRoute, setHighlightedRoute] = useState<number[]>([]);
  const [selectedRouteInfo, setSelectedRouteInfo] = useState<string>('');

  const activeMode = mode;
  const effectiveRound: RoundMode =
    activeMode === 'quadruple-bonus' ? 'r4' : isRoundMode(activeMode) ? roundMode : 'practice';
  const hasTimer = activeMode !== 'practice';
  const roundDuration = activeMode === 'blitz' ? BLITZ_SECONDS : hasTimer ? ROUND_SECONDS : 0;
  const lengthBonus5Plus = activeMode === 'length-bonus-5-plus';
  const isPractice = activeMode === 'practice';
  const isEvolution = activeMode === 'evolution';
  const validMinLength = activeMode === 'long-words-only-4-plus' ? 4 : 2;
  const flatWords = useMemo(() => words.flat().filter(Boolean), [words]);
  const foundWordList = useMemo(() => Object.values(foundWords), [foundWords]);
  const availableHints =
    activeMode === 'inspiration' ? Math.max(0, Math.floor(manualAcceptedCount / 5) - hintsUsed) : 0;
  const baseScore = foundWordList.reduce((total, item) => total + item.score, 0);
  const evolutionBonusScore = evolutionLevels.reduce((total, level) => total + scoreEvolutionLevel(level), 0);
  const totalScore = baseScore + (isEvolution ? evolutionBonusScore : 0);
  const bonusCounts = useMemo(() => countBonuses(bonuses), [bonuses]);
  const canSwipe =
    !finished && !(hasTimer && timeLeft <= 0 && activeMode === 'inspiration' && availableHints > 0);

  const getWordlist = async () => {
    const response = await fetch('/api/wordlist');
    if (!response.ok) throw new Error('Failed to get wordlist');
    return response.json() as Promise<{ message: string[] }>;
  };

  useEffect(() => {
    getWordlist()
      .then((response) => setWordlist(response.message.map((word) => word.toUpperCase()).filter(Boolean)))
      .catch((error) => {
        console.error(error);
        setStatusMessage('Failed to load the word list.');
      });
  }, []);

  useEffect(() => {
    if (wordlist.length === 0 || trie) return;
    const nextTrie = new Trie();
    for (const word of wordlist) nextTrie.insert(word);
    setTrie(nextTrie);
  }, [wordlist, trie]);

  useEffect(() => {
    if (!board || !trie) return;

    const found = findWords(board.size, board.letters, trie)[0]
      .filter((word) => (activeMode === 'long-words-only-4-plus' ? word.length >= 4 : true))
      .sort((a, b) => (a.length === b.length ? (a < b ? -1 : 1) : a.length - b.length));

    setWords(groupWordsByLength(found));
  }, [activeMode, board, trie]);

  useEffect(() => {
    if (!hasTimer || finished || !board) return;

    if (timeLeft <= 0) {
      if (activeMode === 'inspiration' && availableHints > 0) {
        setStatusMessage(
          `Time is up — use your ${availableHints} remaining hint${availableHints === 1 ? '' : 's'} to close the round.`,
        );
        return;
      }
      setFinished(true);
      setStatusMessage('Round finished.');
      return;
    }

    const timer = window.setInterval(() => {
      setTimeLeft((current) => Math.max(0, current - 0.1));
    }, 100);

    return () => window.clearInterval(timer);
  }, [activeMode, availableHints, board, finished, hasTimer, timeLeft]);

  const resetRoundState = useCallback(() => {
    setSwiped({});
    setFoundWords({});
    setManualAcceptedCount(0);
    setHintsUsed(0);
    setPenalties(0);
    setKudos(0);
    setEvolutionLevels(Array(BOARD_SIZE * BOARD_SIZE).fill(0));
    setFinished(false);
    setOpenWordList(false);
    setHighlightedRoute([]);
    setSelectedRouteInfo('');
  }, []);

  const startNewBoard = useCallback(() => {
    resetRoundState();

    const letters =
      activeMode === 'training' ? generateTrainingBoard(wordlist, trainingLetter) : randomBoardLetters();
    const nextBonuses =
      activeMode === 'practice' || activeMode === 'evolution'
        ? Array(BOARD_SIZE * BOARD_SIZE).fill(null)
        : generateBonuses(effectiveRound, letters, activeMode === 'training' ? trainingLetter : undefined);

    setBoard({
      id: `practice-${Date.now()}`,
      author: 'Practice Lab',
      boardName: `${modeTitle(activeMode)} ${effectiveRound.toUpperCase()}`,
      size: BOARD_SIZE,
      letters,
      date: new Date().toISOString().split('T')[0],
      theme: activeMode === 'training' ? 'Rare Letters' : undefined,
      subtheme: activeMode === 'training' ? trainingLetter : undefined,
    });
    setBonuses(nextBonuses);
    setTimeLeft(roundDuration);
    setStatusMessage(
      activeMode === 'practice' ? 'Practice board ready.' : `${modeTitle(activeMode)} board started.`,
    );
  }, [activeMode, effectiveRound, resetRoundState, roundDuration, trainingLetter, wordlist]);

  useEffect(() => {
    if (!board && trie) startNewBoard();
  }, [board, startNewBoard, trie]);

  const addFoundWord = useCallback((entry: FoundWord) => {
    setFoundWords((current) => ({ ...current, [entry.word]: entry }));
    setSwiped((current) => ({ ...current, [entry.word]: true }));
    setHighlightedRoute(entry.path);
    setSelectedRouteInfo(
      `${entry.word}: ${formatRoute(entry.path)}${entry.score ? ` · ${entry.score} pts` : ''}`,
    );
  }, []);

  const handleSubmitTerm = useCallback(
    ({ word, path, isDictionaryWord, isAlreadyFound }: SubmittedTerm): SubmitResult => {
      if (finished) return { accepted: false, color: 'gray' };
      if (hasTimer && timeLeft <= 0) return { accepted: false, color: 'gray' };
      if (!isDictionaryWord) return { accepted: false, color: 'red' };
      if (isAlreadyFound) {
        setHighlightedRoute(foundWords[word]?.path ?? path);
        return { accepted: false, color: 'yellow' };
      }

      if (activeMode === 'long-words-only-4-plus' && word.length < 4) {
        return { accepted: false, color: 'inherit' };
      }

      if (activeMode === 'arena-gladiator' && word.length <= 4) {
        setPenalties((current) => current + 1);
        setStatusMessage(`${word} is too short for gladiator mode. Penalty +1.`);
        return { accepted: false, color: 'red' };
      }

      if (activeMode === 'arena-tight-rope' && word.length !== 4) {
        setPenalties((current) => current + 1);
        setStatusMessage(`${word} is not length 4. Penalty +1.`);
        return { accepted: false, color: 'red' };
      }

      const score = calculatePathScore(board?.letters ?? '', path, bonuses, {
        lengthBonus5Plus,
        practice: isPractice,
      });

      addFoundWord({ word, path, score });
      setManualAcceptedCount((current) => current + 1);

      if (activeMode === 'blitz') {
        setTimeLeft((current) => current + 1);
        setStatusMessage(`${word} accepted. +1 second.`);
      } else if (activeMode === 'arena-8-plus-superior' && word.length >= 8) {
        setKudos((current) => current + 1);
        setStatusMessage(`${word} accepted. Kudo +1.`);
      } else {
        setStatusMessage(`${word} accepted${score ? ` for ${score} points` : ''}.`);
      }

      if (isEvolution) {
        setEvolutionLevels((current) => {
          const next = [...current];
          for (const index of path) next[index] = Math.min(3, next[index] + 1);
          return next;
        });
      }

      return { accepted: true, color: 'green' };
    },
    [
      activeMode,
      addFoundWord,
      board?.letters,
      bonuses,
      finished,
      foundWords,
      hasTimer,
      isEvolution,
      isPractice,
      lengthBonus5Plus,
      timeLeft,
    ],
  );

  const useInspirationHint = useCallback(() => {
    if (!board || availableHints <= 0) return;
    const candidates = flatWords.filter((word) => word.length >= 5 && !foundWords[word]);
    if (candidates.length === 0) {
      setHintsUsed((current) => current + 1);
      setStatusMessage('No remaining 5+ word is available for inspiration.');
      return;
    }

    const word = candidates[Math.floor(Math.random() * candidates.length)];
    const bestRoute = bestRouteForWord(board.size, board.letters, word, bonuses, {
      lengthBonus5Plus,
      practice: isPractice,
    });

    if (!bestRoute) return;
    addFoundWord({ word, path: bestRoute.path, score: bestRoute.score, inspired: true });
    setHintsUsed((current) => current + 1);
    setStatusMessage(`Inspiration found ${word}${bestRoute.score ? ` for ${bestRoute.score} points` : ''}.`);
  }, [addFoundWord, availableHints, board, bonuses, flatWords, foundWords, isPractice, lengthBonus5Plus]);

  useEffect(() => {
    if (
      hasTimer &&
      timeLeft <= 0 &&
      activeMode === 'inspiration' &&
      availableHints === 0 &&
      board &&
      !finished
    ) {
      setFinished(true);
      setStatusMessage('Round finished.');
    }
  }, [activeMode, availableHints, board, finished, hasTimer, timeLeft]);

  const selectWordRoute = useCallback(
    (word: string) => {
      if (!board) return;
      const found = foundWords[word];
      const route = found
        ? { path: found.path, score: found.score }
        : bestRouteForWord(board.size, board.letters, word, bonuses, {
            lengthBonus5Plus,
            practice: isPractice,
          });

      if (!route) {
        setSelectedRouteInfo(`${word}: no route found.`);
        return;
      }

      setHighlightedRoute(route.path);
      setSelectedRouteInfo(
        `${word}: ${formatRoute(route.path)}${route.score ? ` · ${route.score} pts` : ''}`,
      );
    },
    [board, bonuses, foundWords, isPractice, lengthBonus5Plus],
  );

  const changeMainMode = (nextMode: PracticeMode | 'custom-arena') => {
    const resolvedMode = nextMode === 'custom-arena' ? arenaMode : nextMode;
    setMode(resolvedMode);
    setBoard(null);
  };

  const changeArenaMode = (nextArenaMode: ArenaSubmode) => {
    setArenaMode(nextArenaMode);
    setMode(nextArenaMode);
    setBoard(null);
  };

  const changeRoundMode = (nextRoundMode: RoundMode) => {
    setRoundMode(nextRoundMode);
    setBoard(null);
  };

  const changeTrainingLetter = (letter: TrainingLetter) => {
    setTrainingLetter(letter);
    setBoard(null);
  };

  const displayedMainMode = MAIN_MODES.find(
    (candidate) => candidate.id === (mode.startsWith('arena-') ? 'custom-arena' : mode),
  );

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col items-center gap-6 px-4 pb-16 pt-6">
      <section className="w-full rounded-2xl border border-gray-200 bg-white/80 p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950/70">
        <div className="mb-3 flex flex-col gap-1">
          <h1 className="text-2xl font-black">Word Blitz Practice Lab</h1>
          <p className="text-sm text-gray-600 dark:text-gray-300">
            Pick a practice/event/training mode. Multipliers are generated per board and never overlap.
          </p>
        </div>

        <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-5">
          {MAIN_MODES.map((candidate) => (
            <button
              key={candidate.id}
              className={`rounded-xl border p-3 text-left transition hover:-translate-y-0.5 hover:shadow ${
                displayedMainMode?.id === candidate.id
                  ? 'border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-200'
                  : 'border-gray-200 bg-gray-50 dark:border-zinc-800 dark:bg-zinc-900'
              }`}
              onClick={() => changeMainMode(candidate.id)}
            >
              <div className="font-bold">{candidate.label}</div>
              <div className="text-xs opacity-75">{candidate.description}</div>
            </button>
          ))}
        </div>

        {mode.startsWith('arena-') && (
          <div className="mt-4 rounded-xl border border-orange-200 bg-orange-50 p-3 dark:border-orange-900 dark:bg-orange-950/40">
            <div className="mb-2 text-sm font-bold text-orange-700 dark:text-orange-200">
              Custom arena rules
            </div>
            <div className="grid gap-2 md:grid-cols-3">
              {ARENA_CHOICES.map((candidate) => (
                <button
                  key={candidate.id}
                  className={`rounded-lg border p-2 text-left text-sm ${
                    arenaMode === candidate.id
                      ? 'border-orange-500 bg-white text-orange-700 dark:bg-zinc-900 dark:text-orange-200'
                      : 'border-orange-200 bg-orange-100/50 dark:border-orange-900 dark:bg-zinc-900'
                  }`}
                  onClick={() => changeArenaMode(candidate.id)}
                >
                  <div className="font-bold">{candidate.label}</div>
                  <div className="text-xs opacity-75">{candidate.description}</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {mode === 'training' && (
          <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 dark:border-emerald-900 dark:bg-emerald-950/40">
            <div className="mb-2 text-sm font-bold text-emerald-700 dark:text-emerald-200">
              Training letter
            </div>
            <div className="flex flex-wrap gap-2">
              {TRAINING_LETTERS.map((letter) => (
                <button
                  key={letter}
                  className={`h-11 w-11 rounded-lg border text-xl font-black ${
                    trainingLetter === letter
                      ? 'border-emerald-500 bg-white text-emerald-700 dark:bg-zinc-900 dark:text-emerald-200'
                      : 'border-emerald-200 bg-emerald-100/50 dark:border-emerald-900 dark:bg-zinc-900'
                  }`}
                  onClick={() => changeTrainingLetter(letter)}
                >
                  {letter}
                </button>
              ))}
            </div>
          </div>
        )}

        {isRoundMode(mode) && (
          <div className="mt-4 rounded-xl border border-gray-200 bg-gray-50 p-3 dark:border-zinc-800 dark:bg-zinc-900">
            <div className="mb-2 text-sm font-bold">Round bonus layout</div>
            <div className="grid gap-2 md:grid-cols-3">
              {ROUND_CHOICES.map((candidate) => (
                <button
                  key={candidate.id}
                  className={`rounded-lg border p-2 text-left text-sm ${
                    roundMode === candidate.id
                      ? 'border-blue-500 bg-white text-blue-700 dark:bg-zinc-950 dark:text-blue-200'
                      : 'border-gray-200 bg-white dark:border-zinc-800 dark:bg-zinc-950'
                  }`}
                  onClick={() => changeRoundMode(candidate.id)}
                >
                  <div className="font-bold">{candidate.label}</div>
                  <div className="text-xs opacity-75">{candidate.description}</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {mode === 'quadruple-bonus' && (
          <div className="mt-4 rounded-xl border border-green-200 bg-green-50 p-3 text-sm dark:border-green-900 dark:bg-green-950/40">
            Quadruple bonus uses R4: 1×4W, 1×3W, 2×2W, 1×4L, 2×3L, 2×2L.
          </div>
        )}

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            className="rounded-xl bg-blue-600 px-5 py-3 font-bold text-white shadow hover:bg-blue-700"
            onClick={startNewBoard}
            disabled={!trie}
          >
            {trie ? 'Start / reroll board' : 'Loading dictionary...'}
          </button>
          <div className="text-sm text-gray-600 dark:text-gray-300">{statusMessage}</div>
        </div>
      </section>

      {board && (
        <section className="grid w-full gap-6 lg:grid-cols-[1fr_360px]">
          <div className="rounded-2xl border border-gray-200 bg-white/80 p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950/70">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-sm uppercase tracking-wide text-gray-500">{modeTitle(activeMode)}</div>
                <div className="text-xl font-black">
                  {activeMode === 'quadruple-bonus'
                    ? 'R4'
                    : isRoundMode(activeMode)
                      ? roundMode.toUpperCase()
                      : 'free'}{' '}
                  · {board.letters}
                </div>
              </div>
              <div className="flex flex-wrap gap-2 text-sm">
                {hasTimer && (
                  <span className="rounded-full bg-slate-100 px-3 py-1 font-bold dark:bg-zinc-800">
                    ⏱ {formatTime(timeLeft)}s
                  </span>
                )}
                {!isPractice && (
                  <span className="rounded-full bg-blue-100 px-3 py-1 font-bold text-blue-700 dark:bg-blue-950 dark:text-blue-200">
                    Score {totalScore}
                  </span>
                )}
                <button
                  className="rounded-full bg-gray-100 px-3 py-1 font-bold hover:bg-gray-200 dark:bg-zinc-800 dark:hover:bg-zinc-700"
                  onClick={() => setOpenWordList(true)}
                >
                  Words {foundWordList.length}/{flatWords.length}
                </button>
              </div>
            </div>

            <SquareBoard
              size={board.size}
              letters={board.letters}
              swiped={swiped}
              setSwiped={setSwiped}
              validWords={words}
              minLength={validMinLength}
              bonuses={bonuses}
              showTileScores={!isPractice}
              evolutionLevels={isEvolution ? evolutionLevels : []}
              highlightedRoute={highlightedRoute}
              disabled={!canSwipe}
              onSubmitTerm={handleSubmitTerm}
              onWordClick={selectWordRoute}
            />

            {activeMode === 'inspiration' && (
              <div className="mt-5 flex justify-center">
                <button
                  className={`rounded-full px-5 py-3 font-black shadow ${
                    availableHints > 0
                      ? 'bg-purple-600 text-white hover:bg-purple-700'
                      : 'bg-gray-200 text-gray-500 dark:bg-zinc-800'
                  }`}
                  onClick={useInspirationHint}
                  disabled={availableHints <= 0 || finished}
                >
                  💡 Inspiration hint × {availableHints}
                </button>
              </div>
            )}

            {selectedRouteInfo && (
              <div className="mt-4 rounded-xl border border-green-200 bg-green-50 p-3 text-sm font-semibold text-green-800 dark:border-green-900 dark:bg-green-950/40 dark:text-green-100">
                {selectedRouteInfo}
              </div>
            )}
          </div>

          <aside className="rounded-2xl border border-gray-200 bg-white/80 p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950/70">
            <h2 className="mb-3 text-lg font-black">Round stats</h2>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <Stat label="Words" value={`${foundWordList.length}/${flatWords.length}`} />
              <Stat label="Score" value={isPractice ? 'off' : totalScore.toString()} />
              <Stat label="Base" value={isPractice ? 'off' : baseScore.toString()} />
              <Stat label="Evolution" value={isEvolution ? evolutionBonusScore.toString() : '—'} />
              <Stat label="Penalties" value={penalties.toString()} />
              <Stat label="Kudos" value={kudos.toString()} />
              <Stat label="Manual" value={manualAcceptedCount.toString()} />
              <Stat label="Hints used" value={hintsUsed.toString()} />
            </div>

            {!isPractice && (
              <div className="mt-4">
                <h3 className="mb-2 text-sm font-bold text-gray-600 dark:text-gray-300">Bonus tiles</h3>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  {Object.entries(bonusCounts).map(([label, value]) => (
                    <div
                      key={label}
                      className="rounded-lg bg-gray-100 p-2 text-center font-bold dark:bg-zinc-800"
                    >
                      {label}: {value}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-4">
              <h3 className="mb-2 text-sm font-bold text-gray-600 dark:text-gray-300">Found words</h3>
              <div className="max-h-64 overflow-auto rounded-xl border border-gray-100 p-2 text-sm dark:border-zinc-800">
                {foundWordList.length === 0 ? (
                  <div className="text-gray-500">No words yet.</div>
                ) : (
                  foundWordList
                    .sort((a, b) => b.score - a.score || a.word.localeCompare(b.word))
                    .map((item) => (
                      <button
                        key={item.word}
                        className="flex w-full justify-between rounded-lg px-2 py-1 text-left hover:bg-gray-100 dark:hover:bg-zinc-800"
                        onClick={() => selectWordRoute(item.word)}
                      >
                        <span>
                          {item.inspired ? '💡 ' : ''}
                          {item.word}
                        </span>
                        <span className="font-bold">{item.score || ''}</span>
                      </button>
                    ))
                )}
              </div>
            </div>
          </aside>
        </section>
      )}

      {openWordList && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-auto bg-black/60 p-4 pt-10">
          <div className="w-full max-w-3xl rounded-2xl bg-white p-4 shadow-2xl dark:bg-zinc-950">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 className="text-xl font-black">Word list</h2>
              <button
                className="rounded-full bg-gray-100 px-3 py-1 font-bold hover:bg-gray-200 dark:bg-zinc-800"
                onClick={() => setOpenWordList(false)}
              >
                Close
              </button>
            </div>
            <label className="mb-3 flex items-center gap-2 text-sm">
              <input type="checkbox" checked={!mask} onChange={(event) => setMask(!event.target.checked)} />
              reveal unswiped words
            </label>
            <div className="max-h-[70vh] overflow-auto pr-1">
              {words.map((group, length) => {
                if (!group || length === 0) return null;
                return (
                  <div key={length} className="mb-4">
                    <h3 className="mb-2 text-lg font-black text-orange-500">{length} letters</h3>
                    <div className="grid grid-cols-2 gap-1 sm:grid-cols-3 md:grid-cols-4">
                      {group.map((word) => {
                        const found = foundWords[word];
                        return (
                          <button
                            key={word}
                            className={`rounded-lg px-2 py-1 text-left text-sm hover:bg-gray-100 dark:hover:bg-zinc-800 ${found ? 'font-bold text-green-600' : 'text-gray-500'}`}
                            onClick={() => selectWordRoute(word)}
                          >
                            {found || !mask ? word : '*'.repeat(word.length)}
                            {found?.score ? (
                              <span className="ml-1 text-xs opacity-70">{found.score}</span>
                            ) : null}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-gray-100 p-3 dark:bg-zinc-900">
      <div className="text-xs uppercase tracking-wide text-gray-500">{label}</div>
      <div className="text-lg font-black">{value}</div>
    </div>
  );
}
