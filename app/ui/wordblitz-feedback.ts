type VibrationPattern = number | number[];

const NEW_WORD_PATTERN: VibrationPattern = [100, 35, 100];

function vibrate(pattern: VibrationPattern): void {
  if (typeof window === 'undefined' || !('vibrate' in navigator)) return;

  try {
    navigator.vibrate(pattern);
  } catch {
    // Vibration is a best-effort browser feature; unsupported browsers/devices can ignore it.
  }
}

export function vibrateForTileSwipe(): void {
  // Do not vibrate while merely passing over tiles.
}

export function vibrateForNewWord(): void {
  vibrate(NEW_WORD_PATTERN);
}
