import { useMemo } from 'react';
import type { GameCard, GameTableState } from './adapters';
import { computeAvailableActions, type AvailableActions } from './selectors';

const EMPTY: AvailableActions = {
  canAttack: false,
  canDefend: false,
  canThrowIn: false,
  canTransfer: false,
  canTake: false,
  canFinish: false,
};

export function useAvailableActions(state: GameTableState | null, selectedCard: GameCard | null) {
  return useMemo<AvailableActions>(() => {
    if (!state) return EMPTY;
    return computeAvailableActions(state, selectedCard);
  }, [state, selectedCard]);
}

