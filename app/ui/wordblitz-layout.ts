export const WORD_BLITZ_BOARD_SIZE_PX = 328;

const WORD_BLITZ_SAFE_AREA_RATIO = 0.054;
const WORD_BLITZ_LETTER_MARGIN_RATIO = 0.015;
const WORD_BLITZ_LETTER_FONT_RATIO = 1 / 2.11;
const WORD_BLITZ_SELECTED_WORD_HEIGHT_RATIO = 0.4;
const WORD_BLITZ_NORMAL_TILE_RADIUS_EM = 0.42;

export type WordBlitzBoardMetrics = {
  boardSize: number;
  gridGap: number;
  tileSize: number;
  tileFontSize: number;
  selectedWordHeight: number;
  selectedWordFontSize: number;
  tileRadiusEm: number;
};

export function getWordBlitzBoardMetrics(size: number, boardSize = WORD_BLITZ_BOARD_SIZE_PX): WordBlitzBoardMetrics {
  const safeAreaAdjustedSize = boardSize - Math.max(40, boardSize * 2 * WORD_BLITZ_SAFE_AREA_RATIO);
  const rawLetterMargin = Math.floor(safeAreaAdjustedSize * WORD_BLITZ_LETTER_MARGIN_RATIO);
  const letterMargin = Math.max(1, rawLetterMargin);
  const gridGap = letterMargin * 2;
  const totalGap = gridGap * Math.max(0, size - 1);
  const tileSize = Math.floor((boardSize - totalGap) / size);
  const selectedWordHeight = tileSize * WORD_BLITZ_SELECTED_WORD_HEIGHT_RATIO;

  return {
    boardSize,
    gridGap,
    tileSize,
    tileFontSize: tileSize * WORD_BLITZ_LETTER_FONT_RATIO,
    selectedWordHeight,
    selectedWordFontSize: selectedWordHeight * 0.6,
    tileRadiusEm: WORD_BLITZ_NORMAL_TILE_RADIUS_EM,
  };
}
