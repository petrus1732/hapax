'use client';

import SquareBoard, { SubmittedTerm, SubmitResult } from '@/app/ui/square-board';
import { vibrateForNewWord } from '@/app/ui/wordblitz-feedback';
import { Board } from '@/app/lib/definitions';
import { useClientSession } from '@/app/lib/use-client-session';
import { findWords } from '@/app/lib/find-words';
import { Trie } from '@/app/lib/trie';
import {
  BLITZ_SECONDS,
  BOARD_ABUNDANCE_SPECS,
  BOARD_SIZE,
  MAX_BOARD_ROLL_ATTEMPTS,
  BoardAbundance,
  BonusOrNull,
  PracticeMode,
  ROUND_SECONDS,
  RoundMode,
  TRAINING_LETTERS,
  TrainingLetter,
  boardAbundanceDistance,
  boardAbundanceLabel,
  bestRouteForWord,
  calculatePathScore,
  calculateInspirationChargeState,
  classifyBoardAbundance,
  countBonuses,
  countWordsThroughLetter,
  fallbackBoardForMode,
  filterCountableWordsForMode,
  formatRoute,
  generateBonuses,
  generateTrainingBoardCandidate,
  groupWordsByLength,
  hasFivePlusWordThroughLetter,
  isWordCountableInMode,
  randomBoardLetters,
  wordCountMatchesAbundance,
} from '@/app/lib/wordblitz';
import { useCallback, useEffect, useMemo, useState } from 'react';

type ArenaSubmode = 'arena-gladiator' | 'arena-tight-rope' | 'arena-8-plus-superior';
type RoundPhase = 'idle' | 'countdown' | 'playing' | 'finished';

const ROUTE_ANIMATION_STEP_MS = 1000 / 12;

type FoundWord = {
  word: string;
  path: number[];
  score: number;
  inspired?: boolean;
};

const MAIN_MODES: Array<{ id: PracticeMode | 'custom-arena'; label: string; description: string }> = [
  { id: 'practice', label: 'practice', description: 'No score and no multipliers.' },
  {
    id: 'infinite',
    label: 'infinite',
    description: 'No score, no timer; just find as many words as you want.',
  },
  { id: 'normal', label: 'normal', description: 'R1/R2/R3 Word Blitz-style scoring.' },
  { id: 'inspiration', label: 'inspiration', description: 'Earn one hint per 5 manually found words.' },
  {
    id: 'length-bonus-5-plus',
    label: '5+ bonus',
    description: '+50 for each valid word with length at least 5.',
  },
  { id: 'blitz', label: 'blitz', description: '30 seconds; each accepted word adds 1 second.' },
  {
    id: 'long-words-only-4-plus',
    label: '4+ words',
    description: 'Only words of length 4 or more count.',
  },
  { id: 'quadruple-bonus', label: 'quadruple bonus', description: 'R4 board with 4W and 4L tiles.' },
  { id: 'evolution', label: 'evolution', description: 'Tiles level up to +5, +10, and +50.' },
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
    label: 'gladiator',
    description: 'Only length 5+ words count; valid shorter words are penalties.',
  },
  {
    id: 'arena-tight-rope',
    label: 'tight rope',
    description: 'Only length exactly 4 counts; other valid lengths are penalties.',
  },
  {
    id: 'arena-8-plus-superior',
    label: '8+ superior',
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

function waitForNextFrame(): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, 0);
  });
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

export default function RandomBoardClient() {
  const [mode, setMode] = useState<PracticeMode>('practice');
  const [arenaMode, setArenaMode] = useState<ArenaSubmode>('arena-gladiator');
  const [roundMode, setRoundMode] = useState<RoundMode>('r1');
  const [trainingLetter, setTrainingLetter] = useState<TrainingLetter>('Q');
  const [boardAbundance, setBoardAbundance] = useState<BoardAbundance>('normal');
  const [board, setBoard] = useState<Board | null>(null);
  const [bonuses, setBonuses] = useState<BonusOrNull[]>(Array(BOARD_SIZE * BOARD_SIZE).fill(null));
  const [wordlist, setWordlist] = useState<string[]>([]);
  const [trie, setTrie] = useState<Trie | null>(null);
  const [dictionaryWords, setDictionaryWords] = useState<string[][]>([]);
  const [words, setWords] = useState<string[][]>([]);
  const [swiped, setSwiped] = useState<Record<string, boolean>>({});
  const [foundWords, setFoundWords] = useState<Record<string, FoundWord>>({});
  const [manualAcceptedCount, setManualAcceptedCount] = useState(0);
  const [hintsUsed, setHintsUsed] = useState(0);
  const [penalties, setPenalties] = useState(0);
  const [kudos, setKudos] = useState(0);
  const [evolutionLevels, setEvolutionLevels] = useState<number[]>(Array(BOARD_SIZE * BOARD_SIZE).fill(0));
  const [timeLeft, setTimeLeft] = useState(0);
  const [roundPhase, setRoundPhase] = useState<RoundPhase>('idle');
  const [countdown, setCountdown] = useState(0);
  const [finished, setFinished] = useState(false);
  const [isRollingBoard, setIsRollingBoard] = useState(false);
  const [openWordList, setOpenWordList] = useState(false);
  const [mask, setMask] = useState(true);
  const [statusMessage, setStatusMessage] = useState('Choose a mode, then start a board.');
  const [highlightedRoute, setHighlightedRoute] = useState<number[]>([]);
  const [selectedRouteInfo, setSelectedRouteInfo] = useState<string>('');
  const [isInspirationAnimating, setIsInspirationAnimating] = useState(false);
  const [isInspirationClosing, setIsInspirationClosing] = useState(false);
  const [trainingSeedWord, setTrainingSeedWord] = useState<string | null>(null);
  const [persistenceMessage, setPersistenceMessage] = useState<string>('');
  const [playRecordId, setPlayRecordId] = useState<string | null>(null);
  const [completedRecordId, setCompletedRecordId] = useState<string | null>(null);
  const { data: session } = useClientSession();

  const activeMode = mode;
  const effectiveRound: RoundMode =
    activeMode === 'quadruple-bonus' ? 'r4' : isRoundMode(activeMode) ? roundMode : 'practice';
  const hasTimer = activeMode !== 'practice' && activeMode !== 'infinite';
  const personalBestEligible = hasTimer;
  const roundDuration = activeMode === 'blitz' ? BLITZ_SECONDS : hasTimer ? ROUND_SECONDS : 0;
  const lengthBonus5Plus = activeMode === 'length-bonus-5-plus';
  const isPractice = activeMode === 'practice' || activeMode === 'infinite';
  const isEvolution = activeMode === 'evolution';
  const validMinLength = activeMode === 'long-words-only-4-plus' ? 4 : 2;
  const validWordsForSwipe =
    activeMode === 'arena-gladiator' || activeMode === 'arena-tight-rope' ? dictionaryWords : words;
  const flatWords = useMemo(() => words.flat().filter(Boolean), [words]);
  const allBoardWords = useMemo(() => dictionaryWords.flat().filter(Boolean), [dictionaryWords]);
  const showFullWordList = finished || !hasTimer;
  const wordListTitle = showFullWordList ? 'All board words' : 'Word list';
  const wordListGroups = showFullWordList ? dictionaryWords : words;
  const wordListTotal = showFullWordList ? allBoardWords.length : flatWords.length;
  const currentAbundance = classifyBoardAbundance(allBoardWords.length);
  const foundWordList = useMemo(() => Object.values(foundWords), [foundWords]);
  const inspirationCharge = calculateInspirationChargeState(manualAcceptedCount, hintsUsed);
  const availableHints = activeMode === 'inspiration' ? inspirationCharge.availableHints : 0;
  const baseScore = foundWordList.reduce((total, item) => total + item.score, 0);
  const evolutionBonusScore = evolutionLevels.reduce((total, level) => total + scoreEvolutionLevel(level), 0);
  const totalScore = baseScore + (isEvolution ? evolutionBonusScore : 0);
  const bonusCounts = useMemo(() => countBonuses(bonuses), [bonuses]);
  const canSwipe =
    roundPhase === 'playing' && !finished && !isInspirationClosing && !(hasTimer && timeLeft <= 0);

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
      .filter((word) => word.length >= 2)
      .sort((a, b) => (a.length === b.length ? (a < b ? -1 : 1) : a.length - b.length));
    const countable = filterCountableWordsForMode(found, activeMode);

    setDictionaryWords(groupWordsByLength(found));
    setWords(groupWordsByLength(countable));
  }, [activeMode, board, trie]);

  useEffect(() => {
    if (!board) return;

    document.documentElement.classList.add('wb-round-body-locked');
    document.body.classList.add('wb-round-body-locked');
    window.scrollTo(0, 0);

    return () => {
      document.documentElement.classList.remove('wb-round-body-locked');
      document.body.classList.remove('wb-round-body-locked');
    };
  }, [board]);

  useEffect(() => {
    if (roundPhase !== 'countdown') return;

    if (countdown <= 0) {
      setRoundPhase('playing');
      setStatusMessage(
        activeMode === 'practice' ? 'Practice board is ready.' : `${modeTitle(activeMode)} round started.`,
      );
      return;
    }

    const timer = window.setTimeout(() => {
      setCountdown((current) => Math.max(0, current - 1));
    }, 1000);

    return () => window.clearTimeout(timer);
  }, [activeMode, countdown, roundPhase]);

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
    setMask(true);
    setHighlightedRoute([]);
    setSelectedRouteInfo('');
    setTrainingSeedWord(null);
    setPersistenceMessage('');
    setPlayRecordId(null);
    setCompletedRecordId(null);
    setIsInspirationClosing(false);
    setIsInspirationAnimating(false);
  }, []);

  const startNewBoard = useCallback(async () => {
    if (!trie || isRollingBoard) return;

    setIsRollingBoard(true);
    resetRoundState();
    setPlayRecordId(null);
    setCompletedRecordId(null);
    setBoard(null);
    setRoundPhase('idle');
    setCountdown(0);
    setStatusMessage(`Rolling a ${boardAbundanceLabel(boardAbundance)} board...`);

    type Candidate = {
      letters: string;
      seedWord: string | null;
    };

    const avoidHardLetters = boardAbundance === 'rich' || boardAbundance === 'very-rich';
    const richBias =
      boardAbundance === 'very-rich' ? 'very-rich' : boardAbundance === 'rich' ? 'rich' : undefined;
    const generateCandidateLetters = (): Candidate =>
      activeMode === 'training'
        ? generateTrainingBoardCandidate(wordlist, trainingLetter)
        : { letters: randomBoardLetters({ avoidHardLetters, richBias }), seedWord: null };

    const scoreCandidate = (candidate: Candidate) => {
      const [rawFound, allTilesCovered] = findWords(BOARD_SIZE, candidate.letters, trie, {
        minCoverageLength: 2,
        countWordForCoverage: (word) => isWordCountableInMode(word, activeMode),
      });
      const found = rawFound.filter((word) => word.length >= 2);
      const countable = filterCountableWordsForMode(found, activeMode);
      const throughTrainingLetter =
        activeMode === 'training'
          ? countWordsThroughLetter(BOARD_SIZE, candidate.letters, found, trainingLetter)
          : 0;
      const trainingHasFivePlus =
        activeMode === 'training'
          ? hasFivePlusWordThroughLetter(BOARD_SIZE, candidate.letters, found, trainingLetter)
          : true;
      const trainingSatisfied =
        activeMode !== 'training' || trainingHasFivePlus || throughTrainingLetter >= 10;

      return {
        ...candidate,
        found,
        countable,
        count: found.length,
        allTilesCovered,
        abundanceDistance: boardAbundanceDistance(found.length, boardAbundance),
        matchesAbundance: wordCountMatchesAbundance(found.length, boardAbundance),
        trainingSatisfied,
        throughTrainingLetter,
        trainingHasFivePlus,
      };
    };

    const coverageIsRequired = boardAbundance === 'poor' || boardAbundance === 'normal';
    const isAcceptableCandidate = (result: ReturnType<typeof scoreCandidate>) =>
      result.matchesAbundance &&
      result.trainingSatisfied &&
      (!coverageIsRequired || result.allTilesCovered) &&
      (boardAbundance !== 'poor' || result.count >= 10);

    const isBetterCandidate = (
      candidate: ReturnType<typeof scoreCandidate>,
      current: ReturnType<typeof scoreCandidate>,
    ) => {
      if (candidate.trainingSatisfied !== current.trainingSatisfied) return candidate.trainingSatisfied;
      if (candidate.abundanceDistance !== current.abundanceDistance) {
        return candidate.abundanceDistance < current.abundanceDistance;
      }
      if (candidate.allTilesCovered !== current.allTilesCovered) return candidate.allTilesCovered;
      if (boardAbundance === 'poor') return candidate.count < current.count;
      return candidate.count > current.count;
    };

    let bestResult = scoreCandidate(generateCandidateLetters());
    let attemptsUsed = 1;

    const maxRollAttempts =
      boardAbundance === 'very-rich'
        ? MAX_BOARD_ROLL_ATTEMPTS * 5
        : boardAbundance === 'rich'
          ? MAX_BOARD_ROLL_ATTEMPTS * 2
          : MAX_BOARD_ROLL_ATTEMPTS;

    for (let attempt = 0; attempt < maxRollAttempts; attempt += 1) {
      if (isAcceptableCandidate(bestResult)) break;

      attemptsUsed += 1;
      const result = scoreCandidate(generateCandidateLetters());
      if (isBetterCandidate(result, bestResult)) bestResult = result;

      if (attempt % 15 === 14) {
        setStatusMessage(
          `Rolling ${boardAbundanceLabel(boardAbundance)}... best so far has ${bestResult.count} board words${
            bestResult.allTilesCovered ? ' and full tile coverage' : ''
          }.`,
        );
        await waitForNextFrame();
      }
    }

    if (!isAcceptableCandidate(bestResult)) {
      const fallbackLetters = fallbackBoardForMode(activeMode, trainingLetter, boardAbundance);
      const fallbackResult = scoreCandidate({ letters: fallbackLetters, seedWord: null });
      if (isBetterCandidate(fallbackResult, bestResult)) bestResult = fallbackResult;
    }

    const sortedAllWords = bestResult.found.sort((a, b) =>
      a.length === b.length ? (a < b ? -1 : 1) : a.length - b.length,
    );
    const sortedCountableWords = filterCountableWordsForMode(sortedAllWords, activeMode);

    const nextBonuses =
      isPractice || isEvolution
        ? Array(BOARD_SIZE * BOARD_SIZE).fill(null)
        : generateBonuses(
            effectiveRound,
            bestResult.letters,
            activeMode === 'training' ? trainingLetter : undefined,
          );
    const acceptedExact = isAcceptableCandidate(bestResult);
    const seedWord = activeMode === 'training' ? bestResult.seedWord : null;
    const actualAbundance = classifyBoardAbundance(sortedAllWords.length);

    setTrainingSeedWord(seedWord);
    setBoard({
      id: `practice-${Date.now()}`,
      author: 'Practice Lab',
      boardName:
        activeMode === 'training' && seedWord
          ? `${seedWord} ${boardAbundanceLabel(actualAbundance)} training board`
          : `${modeTitle(activeMode)} ${boardAbundanceLabel(actualAbundance)} ${effectiveRound.toUpperCase()}`,
      size: BOARD_SIZE,
      letters: bestResult.letters,
      date: new Date().toISOString().split('T')[0],
      theme: activeMode === 'training' ? 'Rare Letters' : undefined,
      subtheme: activeMode === 'training' ? trainingLetter : undefined,
      sourceMode: activeMode,
      abundance: actualAbundance,
      trainingSeedWord: seedWord,
    });
    setDictionaryWords(groupWordsByLength(sortedAllWords));
    setWords(groupWordsByLength(sortedCountableWords));
    setBonuses(nextBonuses);
    setTimeLeft(roundDuration);
    setRoundPhase(hasTimer ? 'countdown' : 'playing');
    setCountdown(hasTimer ? 3 : 0);
    setStatusMessage(
      `${acceptedExact ? 'Board ready' : 'Closest board ready'} with ${sortedAllWords.length} total words (${boardAbundanceLabel(
        actualAbundance,
      )}) after ${attemptsUsed} roll${attemptsUsed === 1 ? '' : 's'}${
        seedWord ? ` · seed word: ${seedWord}` : ''
      }.`,
    );

    if (session?.user) {
      fetch('/api/profile/rounds', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create',
          round: {
            boardName:
              activeMode === 'training' && seedWord
                ? `${seedWord} ${boardAbundanceLabel(actualAbundance)} training board`
                : `${modeTitle(activeMode)} ${boardAbundanceLabel(actualAbundance)} ${effectiveRound.toUpperCase()}`,
            size: BOARD_SIZE,
            letters: bestResult.letters,
            bonuses: nextBonuses,
            theme: activeMode === 'training' ? 'Rare Letters' : null,
            subtheme: activeMode === 'training' ? trainingLetter : null,
            sourceMode: activeMode,
            roundMode: effectiveRound,
            abundance: actualAbundance,
            trainingSeedWord: seedWord,
            totalWords: sortedAllWords.length,
            countableWords: sortedCountableWords.length,
            foundWords: [],
            foundCount: 0,
            score: 0,
            completed: false,
            personalBestEligible,
          },
        }),
      })
        .then(async (response) => {
          const data = (await response.json().catch(() => null)) as { id?: string } | null;
          if (response.ok && data?.id) setPlayRecordId(data.id);
        })
        .catch(() => undefined);
    }

    setIsRollingBoard(false);
  }, [
    activeMode,
    boardAbundance,
    effectiveRound,
    hasTimer,
    isEvolution,
    isPractice,
    isRollingBoard,
    personalBestEligible,
    resetRoundState,
    roundDuration,
    session?.user,
    trainingLetter,
    trie,
    wordlist,
  ]);

  const addFoundWord = useCallback((entry: FoundWord) => {
    setFoundWords((current) => ({ ...current, [entry.word]: entry }));
    setSwiped((current) => ({ ...current, [entry.word]: true }));
  }, []);

  const recordManualWord = useCallback(
    (entry: FoundWord) => {
      if (!session?.user || entry.inspired) return;
      fetch('/api/profile/words', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          word: entry.word,
          path: entry.path,
          score: entry.score,
          inspired: entry.inspired,
        }),
      }).catch(() => undefined);
    },
    [session?.user],
  );

  const handleSubmitTerm = useCallback(
    ({ word, path, isDictionaryWord, isAlreadyFound }: SubmittedTerm): SubmitResult => {
      if (roundPhase !== 'playing' || finished) return { accepted: false, color: 'gray' };
      if (hasTimer && timeLeft <= 0) return { accepted: false, color: 'gray' };
      if (!isDictionaryWord) return { accepted: false, color: 'red' };
      if (isAlreadyFound) {
        recordManualWord({ word, path, score: 0 });
        setStatusMessage(`${word} was already found.`);
        return { accepted: false, color: 'yellow' };
      }

      if (activeMode === 'long-words-only-4-plus' && word.length < 4) {
        recordManualWord({ word, path, score: 0 });
        return { accepted: false, color: 'inherit' };
      }

      if (activeMode === 'arena-gladiator' && word.length <= 4) {
        recordManualWord({ word, path, score: 0 });
        setPenalties((current) => current + 1);
        setStatusMessage(`${word} is too short for gladiator mode. Penalty +1.`);
        return { accepted: false, color: 'red' };
      }

      if (activeMode === 'arena-tight-rope' && word.length !== 4) {
        recordManualWord({ word, path, score: 0 });
        setPenalties((current) => current + 1);
        setStatusMessage(`${word} is not length 4. Penalty +1.`);
        return { accepted: false, color: 'red' };
      }

      const score = calculatePathScore(board?.letters ?? '', path, bonuses, {
        lengthBonus5Plus,
        practice: isPractice,
      });

      const foundEntry = { word, path, score };
      addFoundWord(foundEntry);
      recordManualWord(foundEntry);
      vibrateForNewWord();
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

      return {
        accepted: true,
        color: 'green',
        flashPath: lengthBonus5Plus && word.length >= 5,
      };
    },
    [
      activeMode,
      addFoundWord,
      recordManualWord,
      board?.letters,
      bonuses,
      finished,
      hasTimer,
      isEvolution,
      isPractice,
      lengthBonus5Plus,
      roundPhase,
      timeLeft,
    ],
  );

  const chooseInspirationHints = useCallback(
    (limit: number): FoundWord[] => {
      if (!board || limit <= 0) return [];

      const alreadyChosen = new Set(Object.keys(foundWords));
      const candidates = flatWords.filter((word) => word.length >= 5 && !alreadyChosen.has(word));
      const chosen: FoundWord[] = [];

      while (chosen.length < limit && candidates.length > 0) {
        const index = Math.floor(Math.random() * candidates.length);
        const [word] = candidates.splice(index, 1);

        const route = bestRouteForWord(board.size, board.letters, word, bonuses, {
          lengthBonus5Plus,
          practice: isPractice,
        });

        if (!route) continue;

        alreadyChosen.add(word);
        chosen.push({
          word,
          path: route.path,
          score: route.score,
          inspired: true,
        });
      }

      return chosen;
    },
    [board, bonuses, flatWords, foundWords, isPractice, lengthBonus5Plus],
  );

  const renderInspirationHints = useCallback(async (hints: FoundWord[]) => {
    setIsInspirationAnimating(true);

    for (const hint of hints) {
      for (let length = 1; length <= hint.path.length; length += 1) {
        setHighlightedRoute(hint.path.slice(0, length));
        await wait(ROUTE_ANIMATION_STEP_MS);
      }

      await wait(ROUTE_ANIMATION_STEP_MS);
    }

    setHighlightedRoute([]);
    setIsInspirationAnimating(false);
  }, []);

  const finishInspirationRound = useCallback(async () => {
    if (!board || isInspirationClosing || finished) return;

    setIsInspirationClosing(true);
    setStatusMessage(
      `Time is up — rendering ${availableHints} inspiration hint${availableHints === 1 ? '' : 's'}...`,
    );

    const hints = chooseInspirationHints(availableHints);

    if (hints.length > 0) {
      // Decide the result first; the route animation is only a visual render.
      setFoundWords((current) => {
        const next = { ...current };
        for (const hint of hints) next[hint.word] = hint;
        return next;
      });

      setSwiped((current) => {
        const next = { ...current };
        for (const hint of hints) next[hint.word] = true;
        return next;
      });

      setHintsUsed((current) => current + hints.length);
      await renderInspirationHints(hints);

      const lastHint = hints[hints.length - 1];
      setSelectedRouteInfo(
        `${lastHint.word} · swipe ${formatRoute(lastHint.path)}${
          lastHint.score ? ` · ${lastHint.score} pts` : ''
        }`,
      );
    }

    setFinished(true);
    setRoundPhase('finished');
    setMask(false);
    setOpenWordList(true);
    setStatusMessage('Round finished.');
    setIsInspirationClosing(false);
  }, [availableHints, board, chooseInspirationHints, finished, isInspirationClosing, renderInspirationHints]);

  useEffect(() => {
    if (!hasTimer || finished || !board || roundPhase !== 'playing') return;

    if (timeLeft <= 0) {
      if (activeMode === 'inspiration' && availableHints > 0) {
        void finishInspirationRound();
        return;
      }

      setFinished(true);
      setRoundPhase('finished');
      setStatusMessage('Round finished.');
      return;
    }

    const timer = window.setInterval(() => {
      setTimeLeft((current) => Math.max(0, current - 0.1));
    }, 100);

    return () => window.clearInterval(timer);
  }, [activeMode, availableHints, board, finished, finishInspirationRound, hasTimer, roundPhase, timeLeft]);

  const useInspirationHint = useCallback(async () => {
    if (!board || availableHints <= 0 || isInspirationAnimating || isInspirationClosing) return;

    const [hint] = chooseInspirationHints(1);
    if (!hint) {
      setHintsUsed((current) => current + 1);
      setStatusMessage('No remaining 5+ word is available for inspiration.');
      return;
    }

    addFoundWord(hint);
    setHintsUsed((current) => current + 1);
    await renderInspirationHints([hint]);

    setSelectedRouteInfo(
      `${hint.word} · swipe ${formatRoute(hint.path)}${hint.score ? ` · ${hint.score} pts` : ''}`,
    );
    setStatusMessage(`Inspiration found ${hint.word}${hint.score ? ` for ${hint.score} points` : ''}.`);
  }, [
    addFoundWord,
    availableHints,
    board,
    chooseInspirationHints,
    isInspirationAnimating,
    isInspirationClosing,
    renderInspirationHints,
  ]);

  useEffect(() => {
    if (roundPhase !== 'finished' || !board) return;
    setMask(false);
    setOpenWordList(true);
  }, [board, roundPhase]);

  const selectWordRoute = useCallback(
    (word: string) => {
      if (!board) return;
      const route = bestRouteForWord(board.size, board.letters, word, bonuses, {
        lengthBonus5Plus,
        practice: isPractice,
      });

      if (!route) {
        setSelectedRouteInfo(`${word}: no route found.`);
        return;
      }

      setHighlightedRoute(route.path);
      setSelectedRouteInfo(
        `${word} · swipe ${formatRoute(route.path)}${route.score ? ` · ${route.score} pts` : ''}`,
      );
    },
    [board, bonuses, isPractice, lengthBonus5Plus],
  );

  const showWordRouteFromModal = (word: string) => {
    selectWordRoute(word);
    setOpenWordList(false);
  };

  const buildPersistedBoardPayload = (boardNamePrefix: string) => {
    if (!board) return null;
    const abundance = classifyBoardAbundance(allBoardWords.length);
    return {
      boardName: `${boardNamePrefix} ${board.letters}`.trim(),
      size: board.size,
      letters: board.letters,
      bonuses,
      theme: board.theme ?? null,
      subtheme: board.subtheme ?? null,
      sourceMode: activeMode,
      abundance,
      trainingSeedWord: trainingSeedWord ?? board.trainingSeedWord ?? null,
    };
  };

  const saveRoundProgress = useCallback(
    async (completed: boolean) => {
      if (!board || !session?.user || !playRecordId) return;
      const foundWordPayload = foundWordList.map((item) => ({
        word: item.word,
        path: item.path,
        score: item.score,
        inspired: Boolean(item.inspired),
      }));

      await fetch('/api/profile/rounds', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update',
          round: {
            id: playRecordId,
            boardName: board.boardName,
            size: board.size,
            letters: board.letters,
            bonuses,
            theme: board.theme ?? null,
            subtheme: board.subtheme ?? null,
            sourceMode: activeMode,
            roundMode: effectiveRound,
            abundance: classifyBoardAbundance(allBoardWords.length),
            trainingSeedWord: trainingSeedWord ?? board.trainingSeedWord ?? null,
            totalWords: allBoardWords.length,
            countableWords: flatWords.length,
            foundWords: foundWordPayload,
            foundCount: foundWordPayload.length,
            score: totalScore,
            completed,
            personalBestEligible,
          },
        }),
      }).catch(() => undefined);

      if (completed) setCompletedRecordId(playRecordId);
    },
    [
      activeMode,
      allBoardWords.length,
      board,
      bonuses,
      effectiveRound,
      flatWords.length,
      foundWordList,
      personalBestEligible,
      playRecordId,
      session?.user,
      totalScore,
      trainingSeedWord,
    ],
  );

  useEffect(() => {
    if (roundPhase !== 'finished' || !playRecordId || completedRecordId === playRecordId) return;
    void saveRoundProgress(true);
  }, [completedRecordId, playRecordId, roundPhase, saveRoundProgress]);

  const rememberBoard = async () => {
    if (!session?.user) {
      setPersistenceMessage('Please log in before remembering a board.');
      return;
    }

    const payload = buildPersistedBoardPayload('remembered');
    if (!payload) return;
    setPersistenceMessage('Saving this board...');

    const response = await fetch('/api/remembered-boards', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = (await response.json().catch(() => null)) as { error?: string } | null;
    setPersistenceMessage(response.ok ? 'Board remembered.' : (data?.error ?? 'Failed to remember board.'));
  };

  const submitBoard = async () => {
    const payload = buildPersistedBoardPayload('submitted');
    if (!payload) return;
    setPersistenceMessage('Submitting this board to the bulletin board...');

    const response = await fetch('/api/boards/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = (await response.json().catch(() => null)) as { error?: string } | null;
    setPersistenceMessage(
      response.ok ? 'Board submitted to the bulletin board.' : (data?.error ?? 'Failed to submit board.'),
    );
  };

  const changeMainMode = (nextMode: PracticeMode | 'custom-arena') => {
    const resolvedMode = nextMode === 'custom-arena' ? arenaMode : nextMode;
    setMode(resolvedMode);
    setBoard(null);
    setRoundPhase('idle');
    setCountdown(0);
    setTimeLeft(0);
    setPersistenceMessage('');
    setStatusMessage('Choose a mode, then press Start.');
  };

  const changeBoardAbundance = (nextAbundance: BoardAbundance) => {
    setBoardAbundance(nextAbundance);
    setBoard(null);
    setRoundPhase('idle');
    setCountdown(0);
    setTimeLeft(0);
    setPersistenceMessage('');
    setStatusMessage('Board abundance changed. Press Start when ready.');
  };

  const changeArenaMode = (nextArenaMode: ArenaSubmode) => {
    setArenaMode(nextArenaMode);
    setMode(nextArenaMode);
    setBoard(null);
    setRoundPhase('idle');
    setCountdown(0);
    setTimeLeft(0);
    setStatusMessage('Choose a mode, then press Start.');
  };

  const changeRoundMode = (nextRoundMode: RoundMode) => {
    setRoundMode(nextRoundMode);
    setBoard(null);
    setRoundPhase('idle');
    setCountdown(0);
    setTimeLeft(0);
    setStatusMessage('Round changed. Press Start when ready.');
  };

  const changeTrainingLetter = (letter: TrainingLetter) => {
    setTrainingLetter(letter);
    setBoard(null);
    setRoundPhase('idle');
    setCountdown(0);
    setTimeLeft(0);
    setStatusMessage('Training letter changed. Press Start when ready.');
  };

  const leaveBoard = () => {
    void saveRoundProgress(roundPhase === 'finished');
    setBoard(null);
    setRoundPhase('idle');
    setCountdown(0);
    setTimeLeft(0);
    setFinished(false);
    setOpenWordList(false);
    setHighlightedRoute([]);
    setSelectedRouteInfo('');
    setPersistenceMessage('');
    setStatusMessage('Choose a mode, then press Start.');
  };

  const displayedMainMode = MAIN_MODES.find(
    (candidate) => candidate.id === (mode.startsWith('arena-') ? 'custom-arena' : mode),
  );

  return (
    <main
      className={
        board
          ? 'wb-round-main w-full px-2 py-2 sm:px-3'
          : 'mx-auto flex w-full max-w-6xl flex-col items-center gap-6 px-4 pb-16 pt-6'
      }
    >
      {!board && (
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

          <div className="mt-4 rounded-xl border border-indigo-200 bg-indigo-50 p-3 dark:border-indigo-900 dark:bg-indigo-950/40">
            <div className="mb-2 text-sm font-bold text-indigo-700 dark:text-indigo-200">Board abundance</div>
            <div className="grid gap-2 md:grid-cols-4">
              {Object.values(BOARD_ABUNDANCE_SPECS).map((candidate) => (
                <button
                  key={candidate.id}
                  className={`rounded-lg border p-2 text-left text-sm ${
                    boardAbundance === candidate.id
                      ? 'border-indigo-500 bg-white text-indigo-700 dark:bg-zinc-900 dark:text-indigo-200'
                      : 'border-indigo-200 bg-indigo-100/50 dark:border-indigo-900 dark:bg-zinc-900'
                  }`}
                  onClick={() => changeBoardAbundance(candidate.id)}
                >
                  <div className="font-bold">{candidate.label}</div>
                  <div className="text-xs opacity-75">{candidate.description}</div>
                </button>
              ))}
            </div>
            <p className="mt-2 text-xs text-indigo-700/80 dark:text-indigo-200/80">
              Rich and Very Rich boards use common-letter rerolls, a looser full-tile-coverage rule, and avoid
              Q/J/X on non-training rerolls.
            </p>
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
              disabled={!trie || isRollingBoard}
            >
              {isRollingBoard
                ? 'Rolling...'
                : trie
                  ? roundPhase === 'idle'
                    ? 'Start board'
                    : 'Start / reroll board'
                  : 'Loading dictionary...'}
            </button>
            <div className="text-sm text-gray-600 dark:text-gray-300">{statusMessage}</div>
          </div>
        </section>
      )}

      {board && (
        <section className="wb-round-layout w-full gap-3">
          <div className="wb-round-panel rounded-2xl border border-gray-200 bg-white/80 p-3 shadow-sm dark:border-zinc-800 dark:bg-zinc-950/70 sm:p-4">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-sm uppercase tracking-wide text-gray-500 dark:text-zinc-400">
                  {modeTitle(activeMode)}
                </div>
                <div className="text-xl font-black text-gray-950 dark:text-zinc-50">
                  {activeMode === 'quadruple-bonus'
                    ? 'R4'
                    : isRoundMode(activeMode)
                      ? roundMode.toUpperCase()
                      : 'free'}{' '}
                  · {board.letters}
                </div>
                <div className="mt-1 text-xs font-semibold text-gray-500 dark:text-zinc-400">
                  {allBoardWords.length} total words · {boardAbundanceLabel(currentAbundance)}
                  {trainingSeedWord ? ` · ${trainingSeedWord} board` : ''}
                </div>
              </div>
              <div className="flex flex-wrap gap-2 text-sm">
                {hasTimer && (
                  <span className="rounded-full bg-slate-100 px-3 py-1 font-bold text-slate-950 dark:bg-zinc-800 dark:text-zinc-50">
                    ⏱ {formatTime(timeLeft)}s
                  </span>
                )}
                {!isPractice && (
                  <span className="rounded-full bg-blue-100 px-3 py-1 font-bold text-blue-700 dark:bg-blue-950 dark:text-blue-200">
                    Score {totalScore}
                  </span>
                )}
                <button
                  className="rounded-full bg-gray-100 px-3 py-1 font-bold text-gray-950 hover:bg-gray-200 dark:bg-zinc-800 dark:text-zinc-50 dark:hover:bg-zinc-700"
                  onClick={() => setOpenWordList(true)}
                >
                  Words {foundWordList.length}/{wordListTotal}
                </button>
                <button
                  className="rounded-full bg-emerald-100 px-3 py-1 font-bold text-emerald-700 hover:bg-emerald-200 dark:bg-emerald-950 dark:text-emerald-200"
                  onClick={rememberBoard}
                >
                  Remember
                </button>
                <button
                  className="rounded-full bg-amber-100 px-3 py-1 font-bold text-amber-800 hover:bg-amber-200 dark:bg-amber-950 dark:text-amber-200"
                  onClick={submitBoard}
                >
                  Submit
                </button>
                <button
                  className="rounded-full bg-blue-600 px-3 py-1 font-bold text-white hover:bg-blue-700"
                  onClick={startNewBoard}
                  disabled={!trie || isRollingBoard}
                >
                  {isRollingBoard ? 'Rolling...' : 'Reroll'}
                </button>
                <button
                  className="rounded-full bg-gray-100 px-3 py-1 font-bold text-gray-950 hover:bg-gray-200 dark:bg-zinc-800 dark:text-zinc-50 dark:hover:bg-zinc-700"
                  onClick={leaveBoard}
                >
                  Modes
                </button>
              </div>
            </div>

            {persistenceMessage && (
              <div className="mb-3 rounded-xl border border-gray-200 bg-gray-50 p-2 text-sm font-semibold text-gray-700 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200">
                {persistenceMessage}
              </div>
            )}

            <div className="wb-board-stage relative">
              <SquareBoard
                size={board.size}
                letters={board.letters}
                swiped={swiped}
                setSwiped={setSwiped}
                validWords={validWordsForSwipe}
                minLength={validMinLength}
                bonuses={bonuses}
                showTileScores={!isPractice}
                evolutionLevels={isEvolution ? evolutionLevels : []}
                highlightedRoute={highlightedRoute}
                disabled={!canSwipe || isInspirationAnimating}
                onSubmitTerm={handleSubmitTerm}
                onWordClick={selectWordRoute}
              />

              {roundPhase === 'countdown' && (
                <div className="absolute inset-0 z-10 flex items-center justify-center rounded-2xl bg-black/45 backdrop-blur-[1px]">
                  <div className="flex h-32 w-32 items-center justify-center rounded-full bg-white text-7xl font-black text-blue-600 shadow-2xl dark:bg-zinc-950 dark:text-blue-300">
                    {countdown || 'GO'}
                  </div>
                </div>
              )}
            </div>

            {activeMode === 'inspiration' && (
              <div className="mt-5 rounded-2xl border border-purple-200 bg-purple-50/80 p-3 dark:border-purple-900 dark:bg-purple-950/30">
                <div className="mb-2 flex items-center justify-between gap-3 text-sm font-bold text-purple-800 dark:text-purple-100">
                  <span>💡 Inspiration charge</span>
                  <span>
                    {inspirationCharge.currentCharge}/{inspirationCharge.threshold} to next · {availableHints}{' '}
                    ready
                  </span>
                </div>
                <div className="wb-inspiration-progress" aria-label="Inspiration charge progress">
                  <div
                    className="wb-inspiration-progress-bar"
                    style={{ width: `${Math.round(inspirationCharge.progressRatio * 100)}%` }}
                  />
                </div>
                <div className="mt-3 flex justify-center">
                  <button
                    className={`rounded-full px-5 py-3 font-black shadow ${
                      availableHints > 0
                        ? 'bg-purple-600 text-white hover:bg-purple-700'
                        : 'bg-gray-200 text-gray-500 dark:bg-zinc-800'
                    }`}
                    onClick={useInspirationHint}
                    disabled={
                      availableHints <= 0 ||
                      finished ||
                      roundPhase !== 'playing' ||
                      isInspirationAnimating ||
                      isInspirationClosing ||
                      (hasTimer && timeLeft <= 0)
                    }
                  >
                    Use inspiration × {availableHints}
                  </button>
                </div>
              </div>
            )}

            {selectedRouteInfo && (
              <div className="mt-4 rounded-xl border border-blue-200 bg-blue-50 p-3 text-sm font-semibold text-blue-800 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-100">
                {selectedRouteInfo}
              </div>
            )}
          </div>

          <aside className="wb-round-sidebar hidden rounded-2xl border border-gray-200 bg-white/80 p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950/70 lg:block">
            <h2 className="mb-3 text-lg font-black">Round stats</h2>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <Stat label="Words" value={`${foundWordList.length}/${wordListTotal}`} />
              <Stat label="Abundance" value={boardAbundanceLabel(currentAbundance)} />
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
              <h2 className="text-xl font-black">{wordListTitle}</h2>
              <button
                className="rounded-full bg-gray-100 px-3 py-1 font-bold hover:bg-gray-200 dark:bg-zinc-800"
                onClick={() => setOpenWordList(false)}
              >
                Close
              </button>
            </div>
            {showFullWordList ? (
              <div className="mb-3 rounded-xl bg-blue-50 p-3 text-sm font-semibold text-blue-800 dark:bg-blue-950/40 dark:text-blue-100">
                {finished
                  ? `Time is up. All ${allBoardWords.length} board words are revealed.`
                  : `Untimed mode: all ${allBoardWords.length} board words are available from the Words button.`}{' '}
                Click any word to see its highest-scoring route.
              </div>
            ) : (
              <label className="mb-3 flex items-center gap-2 text-sm">
                <input type="checkbox" checked={!mask} onChange={(event) => setMask(!event.target.checked)} />
                reveal unswiped words
              </label>
            )}
            <div className="max-h-[70vh] overflow-auto pr-1">
              {wordListGroups.map((group, length) => {
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
                            onClick={() => showWordRouteFromModal(word)}
                          >
                            {showFullWordList || found || !mask ? word : '*'.repeat(word.length)}
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
    <div className="rounded-xl bg-gray-100 p-3 text-gray-950 dark:bg-zinc-900 dark:text-zinc-50">
      <div className="text-xs uppercase tracking-wide text-gray-500 dark:text-zinc-400">{label}</div>
      <div className="text-lg font-black text-gray-950 dark:text-zinc-50">{value}</div>
    </div>
  );
}
