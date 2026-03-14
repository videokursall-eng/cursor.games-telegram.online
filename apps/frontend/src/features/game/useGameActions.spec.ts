import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useGameActions } from './useGameActions';
import * as client from '../../api/client';

vi.mock('../../api/client', () => ({
  api: vi.fn(async () => ({})),
}));

vi.mock('../../store/authStore', () => {
  const state = {
    accessToken: 'test-token',
    user: { id: 'u1' },
  };
  return {
    useAuthStore: (selector: (s: typeof state) => unknown) => selector(state),
  };
});

describe('useGameActions', () => {
  beforeEach(() => {
    (client.api as unknown as ReturnType<typeof vi.fn>).mockClear();
  });

  it('increments clientSeq for each action and sends it in payload', async () => {
    const refetch = vi.fn();
    const { result } = renderHook(() => useGameActions('room-1', refetch));

    await act(async () => {
      await result.current.sendAction({ type: 'attack', card: { rank: '6', suit: 'hearts' } });
    });

    await act(async () => {
      await result.current.sendAction({ type: 'take' });
    });

    expect(client.api).toHaveBeenCalledTimes(2);
    const calls = (client.api as unknown as ReturnType<typeof vi.fn>).mock.calls;
    const firstBody = JSON.parse(calls[0][1].body as string);
    const secondBody = JSON.parse(calls[1][1].body as string);

    expect(firstBody.clientSeq).toBe(0);
    expect(secondBody.clientSeq).toBe(1);
    expect(typeof firstBody.clientCommandId).toBe('string');
    expect(typeof secondBody.clientCommandId).toBe('string');
    expect(firstBody.clientCommandId).not.toBe(secondBody.clientCommandId);
  });

  it('resets clientSeq when roomId changes', async () => {
    const refetch = vi.fn();
    const { result, rerender } = renderHook(
      ({ roomId }) => useGameActions(roomId, refetch),
      { initialProps: { roomId: 'room-1' } },
    );

    await act(async () => {
      await result.current.sendAction({ type: 'attack', card: { rank: '6', suit: 'hearts' } });
    });

    rerender({ roomId: 'room-2' });

    await act(async () => {
      await result.current.sendAction({ type: 'attack', card: { rank: '7', suit: 'clubs' } });
    });

    const calls = (client.api as unknown as ReturnType<typeof vi.fn>).mock.calls;
    const bodyFirst = JSON.parse(calls[0][1].body as string);
    const bodySecond = JSON.parse(calls[1][1].body as string);

    expect(bodyFirst.clientSeq).toBe(0);
    expect(bodySecond.clientSeq).toBe(0);
    expect(typeof bodyFirst.clientCommandId).toBe('string');
    expect(typeof bodySecond.clientCommandId).toBe('string');
  });
});

