type VibrationPattern = number | number[];

const TILE_SWIPE_PATTERN: VibrationPattern = [45, 18, 45];
const NEW_WORD_PATTERN: VibrationPattern = [90, 30, 90, 30, 120];

function vibrate(pattern: VibrationPattern): void {
  if (typeof window === 'undefined' || !('vibrate' in navigator)) return;

  try {
    navigator.vibrate(pattern);
  } catch {
    // Vibration is a best-effort browser feature; unsupported browsers/devices can ignore it.
  }
}

export function vibrateForTileSwipe(): void {
  vibrate(TILE_SWIPE_PATTERN);
}

export function vibrateForNewWord(): void {
  vibrate(NEW_WORD_PATTERN);
}
