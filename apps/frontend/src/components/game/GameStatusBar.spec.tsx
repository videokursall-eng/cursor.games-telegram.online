import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { GameStatusBar } from './GameStatusBar';

describe('GameStatusBar with TurnTimer', () => {
  const now = 1_000_000;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(now);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders timer when current player is active and not finished', () => {
    render(
      <GameStatusBar
        currentPlayerName="Вы"
        phase="attack"
        hint="Ваш ход"
        syncing={false}
        waiting={false}
        reconnecting={false}
        stale={false}
        actionPending={false}
        turnStartedAt={now}
        turnDurationSeconds={30}
        isCurrentPlayerActive
        isFinished={false}
      />,
    );

    expect(screen.getByText('00:30')).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(screen.getByText((text) => text.startsWith('00:2'))).toBeInTheDocument();
  });

  it('does not render timer when match is finished', () => {
    render(
      <GameStatusBar
        currentPlayerName="Вы"
        phase="finished"
        hint="Матч завершён"
        syncing={false}
        waiting={false}
        reconnecting={false}
        stale={false}
        actionPending={false}
        turnStartedAt={now}
        turnDurationSeconds={30}
        isCurrentPlayerActive
        isFinished
      />,
    );

    expect(screen.queryByText(/00:/)).toBeNull();
  });

  it('shows different labels for syncing, reconnecting, stale, waiting and pending', () => {
    const { rerender } = render(
      <GameStatusBar
        currentPlayerName="Вы"
        phase="attack"
        hint=""
        syncing
        waiting={false}
        reconnecting={false}
        stale={false}
        actionPending={false}
        isFinished={false}
      />,
    );
    expect(screen.getByText(/Синхронизация…/)).toBeInTheDocument();

    rerender(
      <GameStatusBar
        currentPlayerName="Вы"
        phase="attack"
        hint=""
        syncing={false}
        waiting={false}
        reconnecting
        stale={false}
        actionPending={false}
        isFinished={false}
      />,
    );
    expect(screen.getByText(/Переподключение…/)).toBeInTheDocument();

    rerender(
      <GameStatusBar
        currentPlayerName="Вы"
        phase="attack"
        hint=""
        syncing={false}
        waiting={false}
        reconnecting={false}
        stale
        actionPending={false}
        isFinished={false}
      />,
    );
    expect(screen.getByText(/Состояние может быть устаревшим/)).toBeInTheDocument();

    rerender(
      <GameStatusBar
        currentPlayerName="Вы"
        phase="attack"
        hint=""
        syncing={false}
        waiting
        reconnecting={false}
        stale={false}
        actionPending={false}
        isFinished={false}
      />,
    );
    expect(screen.getByText(/Ожидание хода другого игрока/)).toBeInTheDocument();

    rerender(
      <GameStatusBar
        currentPlayerName="Вы"
        phase="attack"
        hint=""
        syncing={false}
        waiting={false}
        reconnecting={false}
        stale={false}
        actionPending
        isFinished={false}
      />,
    );
    expect(screen.getByText(/Отправка действия…/)).toBeInTheDocument();
  });

  it('shows "Ход бота" when isBotTurn is true and not reconnecting/syncing/stale', () => {
    render(
      <GameStatusBar
        currentPlayerName="Вы"
        phase="defense"
        hint=""
        syncing={false}
        waiting={false}
        reconnecting={false}
        stale={false}
        actionPending={false}
        isBotTurn
        isFinished={false}
      />,
    );
    expect(screen.getByText('Ход бота')).toBeInTheDocument();
  });

  it('does not show "Ход бота" when isBotTurn is false (user turn)', () => {
    render(
      <GameStatusBar
        currentPlayerName="Вы"
        phase="attack"
        hint=""
        syncing={false}
        waiting={false}
        reconnecting={false}
        stale={false}
        actionPending={false}
        isBotTurn={false}
        isFinished={false}
      />,
    );
    expect(screen.queryByText('Ход бота')).not.toBeInTheDocument();
  });

  it('prioritizes reconnecting over isBotTurn', () => {
    render(
      <GameStatusBar
        currentPlayerName="Вы"
        phase="attack"
        hint=""
        syncing={false}
        waiting={false}
        reconnecting
        stale={false}
        actionPending={false}
        isBotTurn
        isFinished={false}
      />,
    );
    expect(screen.getByText(/Переподключение…/)).toBeInTheDocument();
    expect(screen.queryByText('Ход бота')).not.toBeInTheDocument();
  });

  it('prioritizes syncing over isBotTurn', () => {
    render(
      <GameStatusBar
        currentPlayerName="Вы"
        phase="attack"
        hint=""
        syncing
        waiting={false}
        reconnecting={false}
        stale={false}
        actionPending={false}
        isBotTurn
        isFinished={false}
      />,
    );
    expect(screen.getByText(/Синхронизация…/)).toBeInTheDocument();
    expect(screen.queryByText('Ход бота')).not.toBeInTheDocument();
  });
});

