import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { TurnTimer } from './TurnTimer';

describe('TurnTimer', () => {
  const now = 1_000_000;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(now);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders initial remaining time', () => {
    render(<TurnTimer startedAt={now} durationSeconds={30} />);
    expect(screen.getByText('00:30')).toBeInTheDocument();
  });

  it('counts down over time', () => {
    render(<TurnTimer startedAt={now} durationSeconds={30} />);
    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(screen.getByText((text) => text.startsWith('00:2'))).toBeInTheDocument();
  });
});

