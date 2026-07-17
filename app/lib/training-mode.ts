import type { Board } from './definitions';
import { parseBonuses } from './board-storage';
import type { BoardAbundance, BonusOrNull, PracticeMode, TrainingLetter } from './wordblitz';

export type TrainingPace = 'timed' | 'untimed';
export type TrainingBoardSource = 'random' | 'saved';

export type CanonicalBoard = Omit<Board, 'bonuses'> & {
  bonuses: BonusOrNull[];
  sourceMode: string | null;
  abundance: string | null;
  trainingSeedWord: string | null;
};

export function normalizeStoredBoard(value: Board | Record<string, unknown>): CanonicalBoard {
  const record = value as Record<string, unknown>;
  const sizeValue = Number(record.size ?? 4);
  const size = Number.isInteger(sizeValue) && sizeValue > 0 ? sizeValue : 4;
  const letters = String(record.letters ?? '').toUpperCase();

  return {
    id: String(record.id ?? ''),
    author: String(record.author ?? 'unknown'),
    boardName: String(record.boardName ?? record.board_name ?? 'Untitled board'),
    size,
    letters,
    date: String(record.date ?? ''),
    theme: typeof record.theme === 'string' ? record.theme : undefined,
    subtheme: typeof record.subtheme === 'string' ? record.subtheme : undefined,
    bonuses: parseBonuses(record.bonuses, size * size),
    sourceMode:
      typeof record.sourceMode === 'string'
        ? record.sourceMode
        : typeof record.source_mode === 'string'
          ? record.source_mode
          : null,
    abundance: typeof record.abundance === 'string' ? record.abundance : null,
    trainingSeedWord:
      typeof record.trainingSeedWord === 'string'
        ? record.trainingSeedWord.toUpperCase()
        : typeof record.training_seed_word === 'string'
          ? record.training_seed_word.toUpperCase()
          : null,
  };
}

export function trainingHasTimer(pace: TrainingPace): boolean {
  return pace === 'timed';
}

export function canInspectSwipeResult(mode: PracticeMode, pace: TrainingPace): boolean {
  return mode === 'training' && pace === 'untimed';
}

export function boardMatchesTrainingSelection(
  board: CanonicalBoard,
  letter: TrainingLetter,
  abundance: BoardAbundance,
): boolean {
  if (board.size !== 4 || board.letters.length !== 16 || !board.letters.includes(letter)) return false;
  return board.abundance === null || board.abundance === abundance;
}

export async function animateRoutePreview(
  path: number[],
  onFrame: (visiblePath: number[]) => void,
  sleep: (milliseconds: number) => Promise<void>,
  durationMs = 1000,
): Promise<void> {
  const safeDuration = Math.max(0, Math.floor(durationMs));
  if (path.length === 0) {
    if (safeDuration > 0) await sleep(safeDuration);
    onFrame([]);
    return;
  }

  const stepDuration = Math.floor(safeDuration / path.length);
  const remainder = safeDuration - stepDuration * path.length;

  for (let length = 1; length <= path.length; length += 1) {
    onFrame(path.slice(0, length));
    if (stepDuration > 0) await sleep(stepDuration);
  }

  if (remainder > 0) await sleep(remainder);
  onFrame([]);
}
