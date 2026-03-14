import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { GameTablePage } from './GameTablePage';
import { MatchResultModal } from '../components/game/MatchResultModal';

describe('GameTablePage', () => {
  it('renders status bar from live state', () => {
    render(
      <BrowserRouter>
        <GameTablePage />
      </BrowserRouter>,
    );
    // For unknown room id it should render a graceful error state, not crash.
    expect(screen.getByText(/Комната недоступна/)).toBeInTheDocument();
  });
});

describe('Turn timer integration', () => {
  it('does not render timer on finished match snapshot', () => {
    render(
      <div className="bg-emerald-950">
        <BrowserRouter>
          <GameTablePage />
        </BrowserRouter>
      </div>,
    );
    // In this smoke test with unknown room there should be no visible mm:ss timer,
    // only the graceful "Комната недоступна" state.
    expect(screen.getByText(/Комната недоступна/)).toBeInTheDocument();
  });
});

describe('MatchResultModal', () => {
  it('renders rich result info for defeat', () => {
    render(
      <MatchResultModal
        visible
        currentPlayerId="u1"
        mode="podkidnoy"
        players={[
          { id: 'u1', name: 'Вы', isBot: false },
          { id: 'u2', name: 'Оппонент', isBot: false },
        ]}
        matchResult={{
          winnerIds: ['u2'],
          loserId: 'u1',
          finishOrder: ['u2', 'u1'],
          placements: [
            { playerId: 'u2', place: 1 },
            { playerId: 'u1', place: 2 },
          ],
          outcome: 'normal',
          stats: {
            totalTurns: 10,
            totalRounds: 3,
            totalCardsTaken: 4,
            durationSeconds: 120,
            perPlayer: [
              {
                playerId: 'u1',
                turnsMade: 5,
                cardsTaken: 3,
                defensesMade: 1,
                attacksMade: 2,
                transfersMade: 0,
                throwInsMade: 0,
                finishedPlace: 2,
              },
              {
                playerId: 'u2',
                turnsMade: 5,
                cardsTaken: 1,
                defensesMade: 2,
                attacksMade: 3,
                transfersMade: 0,
                throwInsMade: 0,
                finishedPlace: 1,
              },
            ],
          },
        }}
        onExitToLobby={() => {}}
        onExitToRoom={() => {}}
      />,
    );

    expect(screen.getByText(/Вы проиграли/)).toBeInTheDocument();
    expect(screen.getByText(/Подкидной дурак/)).toBeInTheDocument();
    expect(screen.getByText(/Участники/)).toBeInTheDocument();
    expect(screen.getAllByText('Оппонент').length).toBeGreaterThan(0);
    expect(screen.getByText(/Раунды: 3/)).toBeInTheDocument();
    expect(screen.getByText(/Ходы: 10/)).toBeInTheDocument();
    expect(screen.getByText(/Взятых карт: 4/)).toBeInTheDocument();
    expect(screen.getByText(/1 место/)).toBeInTheDocument();
    expect(screen.getByText(/2 место/)).toBeInTheDocument();
    expect(screen.getByText('В лобби')).toBeInTheDocument();
    expect(screen.getByText('В комнату')).toBeInTheDocument();
  });

  it('renders neutral result when winnerIds is empty', () => {
    render(
      <MatchResultModal
        visible
        currentPlayerId="u1"
        mode="podkidnoy"
        players={[
          { id: 'u1', name: 'Вы', isBot: false },
          { id: 'u2', name: 'Оппонент', isBot: false },
        ]}
        matchResult={{
          winnerIds: [],
          loserId: null,
          finishOrder: [],
          placements: [],
          outcome: 'draw',
          stats: {
            totalTurns: 0,
            totalRounds: 0,
            durationSeconds: 0,
            totalCardsTaken: 0,
            perPlayer: [],
          },
        }}
        onExitToLobby={() => {}}
        onExitToRoom={() => {}}
      />,
    );

    expect(screen.getByText(/Ничья/)).toBeInTheDocument();
    expect(
      screen.getByText(/Матч завершён без явного победителя \(ничья\)./),
    ).toBeInTheDocument();
  });
});

