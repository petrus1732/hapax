import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { groupWordsByLength } from '@/app/lib/wordblitz';
import SquareBoard, { type SubmittedTerm, type SubmitResult } from './square-board';

function renderBoard(
  overrides: Partial<Parameters<typeof SquareBoard>[0]> = {},
  onSubmitTerm: (term: SubmittedTerm) => SubmitResult = () => ({ accepted: true, color: 'green' }),
) {
  const setSwiped = vi.fn();
  const props = {
    size: 4,
    letters: 'ABCDEFGHIJKLMNOP',
    swiped: {},
    setSwiped,
    validWords: groupWordsByLength(['AB', 'ABC', 'AFK', 'AEJ', 'CFI']),
    minLength: 2,
    onSubmitTerm: vi.fn(onSubmitTerm),
    ...overrides,
  };

  const view = render(React.createElement(SquareBoard, props));
  const tile = (index: number) => view.container.querySelector(`[data-tile-id="${index}"]`) as HTMLElement;
  return { ...view, props, tile, setSwiped };
}

describe('SquareBoard', () => {
  it('submits an adjacent valid word with the exact route', () => {
    const { props, tile } = renderBoard();

    fireEvent.mouseDown(tile(0));
    fireEvent.mouseEnter(tile(1));
    fireEvent.mouseUp(tile(1));

    expect(props.onSubmitTerm).toHaveBeenCalledTimes(1);
    expect(props.onSubmitTerm).toHaveBeenCalledWith({
      word: 'AB',
      path: [0, 1],
      isDictionaryWord: true,
      isAlreadyFound: false,
    });
    expect(screen.getByText('AB')).toHaveStyle({ color: 'rgb(0, 128, 0)' });
  });

  it('passes non-dictionary words to the mode callback and honors its rejection color', () => {
    const { props, tile } = renderBoard({ validWords: groupWordsByLength(['AB']) }, (term) => ({
      accepted: false,
      color: term.isDictionaryWord ? 'green' : 'red',
    }));

    fireEvent.mouseDown(tile(0));
    fireEvent.mouseEnter(tile(4));
    fireEvent.mouseUp(tile(4));

    expect(props.onSubmitTerm).toHaveBeenCalledWith({
      word: 'AE',
      path: [0, 4],
      isDictionaryWord: false,
      isAlreadyFound: false,
    });
    expect(screen.getByText('AE')).toHaveStyle({ color: 'rgb(255, 0, 0)' });
  });

  it('reports an already-found word to the game-mode callback', () => {
    const { props, tile } = renderBoard({ swiped: { AB: true } });

    fireEvent.mouseDown(tile(0));
    fireEvent.mouseEnter(tile(1));
    fireEvent.mouseUp(tile(1));

    expect(props.onSubmitTerm).toHaveBeenCalledWith(
      expect.objectContaining({ word: 'AB', isAlreadyFound: true }),
    );
  });

  it('ignores paths below the configured minimum length', () => {
    const { props, tile } = renderBoard({ minLength: 3 });

    fireEvent.mouseDown(tile(0));
    fireEvent.mouseEnter(tile(1));
    fireEvent.mouseUp(tile(1));

    expect(props.onSubmitTerm).not.toHaveBeenCalled();
  });

  it('does not move to non-adjacent tiles', () => {
    const { props, tile } = renderBoard({ validWords: groupWordsByLength(['AD']) });

    fireEvent.mouseDown(tile(0));
    fireEvent.mouseEnter(tile(3));
    fireEvent.mouseUp(tile(3));

    expect(props.onSubmitTerm).not.toHaveBeenCalled();
  });

  it('supports backtracking to the previous tile', () => {
    const { props, tile } = renderBoard();

    fireEvent.mouseDown(tile(0));
    fireEvent.mouseEnter(tile(1));
    fireEvent.mouseEnter(tile(0));
    fireEvent.mouseUp(tile(0));

    expect(props.onSubmitTerm).not.toHaveBeenCalled();
  });

  it('does not start recording when disabled', () => {
    const { props, tile } = renderBoard({ disabled: true });

    fireEvent.mouseDown(tile(0));
    fireEvent.mouseEnter(tile(1));
    fireEvent.mouseUp(tile(1));

    expect(props.onSubmitTerm).not.toHaveBeenCalled();
  });

  it('renders score dots, tile points, evolution levels, and highlighted routes', () => {
    const { container } = renderBoard({
      bonuses: ['dw', null, null, null, null, 'tl'],
      showTileScores: true,
      evolutionLevels: [0, 3, 0, 0, 0, 2],
      highlightedRoute: [1, 5],
    });

    expect(screen.getByText('2W')).toBeInTheDocument();
    expect(screen.getByText('3L')).toBeInTheDocument();
    expect(screen.getByText('Lv.3')).toBeInTheDocument();
    expect(screen.getByText('Lv.2')).toBeInTheDocument();
    expect(container.querySelector('[data-tile-id="1"]')).toHaveClass('wb-tile-route');
    expect(container.querySelector('[data-tile-id="5"]')).toHaveClass('wb-tile-route');
  });

  it('falls back to local swiped state behavior when no mode callback is supplied', () => {
    const { setSwiped, tile } = renderBoard({ onSubmitTerm: undefined });

    fireEvent.mouseDown(tile(0));
    fireEvent.mouseEnter(tile(1));
    fireEvent.mouseUp(tile(1));

    expect(setSwiped).toHaveBeenCalledTimes(1);
    expect(screen.getByText('AB')).toHaveStyle({ color: 'rgb(0, 128, 0)' });
  });
});
