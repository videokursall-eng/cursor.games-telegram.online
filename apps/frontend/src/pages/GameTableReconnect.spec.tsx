import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';

vi.mock('../features/game/useGameTableState', () => {
  const refetch = vi.fn();
  return {
    useGameTableState: () => ({
      state: {
        roomId: 'r1',
        mode: 'podkidnoy',
        phase: 'attack',
        currentPlayer: { id: 'u1', name: 'Вы', isBot: false, cardCount: 6, isCurrent: true, isActive: true },
        opponents: [],
        hand: [],
        battlePairs: [],
        deckCount: 10,
        trump: { id: 'r1:trump', rank: 'A', suit: 'hearts', playable: false },
        isFinished: false,
        hint: '',
        matchResult: undefined,
      },
      meta: {
        loading: false,
        error: 'Проблемы с сетью',
        syncing: false,
        reconnecting: false,
        offline: true,
        stale: true,
      },
      refetch,
    }),
  };
});

vi.mock('../features/game/useGameActions', () => {
  return {
    useGameActions: () => ({
      sendAction: vi.fn(),
      pending: null,
      error: null,
    }),
  };
});

import { GameTablePage } from './GameTablePage';

describe('GameTablePage reconnect UX', () => {
  it('renders reconnect banner and retry triggers refetch', async () => {
    render(
      <BrowserRouter>
        <GameTablePage />
      </BrowserRouter>,
    );

    expect(await screen.findByText(/Нет соединения/)).toBeInTheDocument();
    const retryButton = screen.getByLabelText('retry-sync');
    fireEvent.click(retryButton);

    // refetch вызывается через мокнутый useGameTableState
    const module = await import('../features/game/useGameTableState');
    const hookResult = module.useGameTableState('r1') as { refetch: () => void };
    expect(hookResult.refetch).toHaveBeenCalled();
  });
});

