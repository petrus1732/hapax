import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import Tile from './tile';

function renderTile(overrides: Partial<Parameters<typeof Tile>[0]> = {}) {
  const props = {
    id: 3,
    letter: 'Q',
    fontSize: 32,
    onStart: vi.fn(),
    onMove: vi.fn(),
    isActive: false,
    ...overrides,
  };

  const view = render(React.createElement(Tile, props));
  const tile = view.container.querySelector('[data-tile-id="3"]') as HTMLElement;
  return { ...view, props, tile };
}

describe('Tile', () => {
  it('renders the letter, the point value, and the multiplier dot', () => {
    renderTile({ bonus: 'tw', points: 8, showPoints: true });

    expect(screen.getByText('Q')).toBeInTheDocument();
    expect(screen.getByText('8')).toBeInTheDocument();
    expect(screen.getByText('3W')).toBeInTheDocument();
  });

  it('adds visual classes for active, highlighted-route, and max-evolution states', () => {
    const { tile, rerender, props } = renderTile({ isActive: true, bonus: 'dl' });
    expect(tile).toHaveClass('wb-tile-active');
    expect(tile).toHaveClass('wb-tile-2l');

    rerender(
      React.createElement(Tile, {
        ...props,
        isActive: false,
        isRouteHighlighted: true,
        evolutionLevel: 3,
        bonus: 'qw',
      }),
    );
    expect(tile).toHaveClass('wb-tile-route');
    expect(tile).toHaveClass('wb-tile-evolution-max');
    expect(tile).toHaveClass('wb-tile-4w');
  });

  it('calls mouse callbacks only when enabled', () => {
    const { props, tile } = renderTile();

    fireEvent.mouseDown(tile);
    fireEvent.mouseEnter(tile);

    expect(props.onStart).toHaveBeenCalledWith(3);
    expect(props.onMove).toHaveBeenCalledWith(3);
  });

  it('does not start or move when disabled', () => {
    const { props, tile } = renderTile({ disabled: true });

    fireEvent.mouseDown(tile);
    fireEvent.mouseEnter(tile);

    expect(props.onStart).not.toHaveBeenCalled();
    expect(props.onMove).not.toHaveBeenCalled();
  });

  it('shows an evolution level badge only after the tile has leveled up', () => {
    const { rerender, props } = renderTile({ evolutionLevel: 0 });
    expect(screen.queryByText('Lv.1')).not.toBeInTheDocument();

    rerender(React.createElement(Tile, { ...props, evolutionLevel: 2 }));
    expect(screen.getByText('Lv.2')).toBeInTheDocument();
  });
});
