import { useState, useCallback, useRef, useEffect } from 'react';
import { api } from '../../api/client';
import { useAuthStore } from '../../store/authStore';

type ActionType = 'attack' | 'defend' | 'throwIn' | 'transfer' | 'take' | 'finish';

interface ActionPayload {
  type: ActionType;
  card?: { rank: string; suit: string };
  attackIndex?: number;
}

export function useGameActions(roomId: string | undefined, refetch: () => Promise<void> | void) {
  const token = useAuthStore((s) => s.accessToken);
  const [pending, setPending] = useState<ActionType | null>(null);
  const [error, setError] = useState<string | null>(null);
  const seqRef = useRef<number>(0);
  const commandCounterRef = useRef<number>(0);

  // При смене комнаты начинаем sequence заново в рамках новой игровой сессии.
  useEffect(() => {
    seqRef.current = 0;
  }, [roomId]);

  const sendAction = useCallback(
    async (payload: ActionPayload) => {
      if (!roomId || !token || pending) return;
      setPending(payload.type);
      setError(null);
      try {
        const clientSeq = seqRef.current++;
        const clientCommandId = `http-${roomId ?? 'none'}-${Date.now()}-${commandCounterRef.current++}`;
        const body =
          payload.type === 'attack' ||
          payload.type === 'defend' ||
          payload.type === 'throwIn' ||
          payload.type === 'transfer'
            ? { type: payload.type, card: payload.card, attackIndex: payload.attackIndex, clientSeq, clientCommandId }
            : { type: payload.type, clientSeq, clientCommandId };

        await api(`/rooms/${roomId}/action`, {
          method: 'POST',
          token,
          body: JSON.stringify(body),
        });
        await Promise.resolve(refetch());
      } catch (e) {
        const err = e as Error;
        setError(err.message || 'Ошибка отправки действия');
      } finally {
        setPending(null);
      }
    },
    [roomId, token, pending, refetch],
  );

  return { sendAction, pending, error };
}


