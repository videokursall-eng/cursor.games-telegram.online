import type { GameCard, GameTableState } from './adapters';

export interface AvailableActions {
  canAttack: boolean;
  canDefend: boolean;
  canThrowIn: boolean;
  canTransfer: boolean;
  canTake: boolean;
  canFinish: boolean;
}

export function computeAvailableActions(state: GameTableState, selectedCard: GameCard | null): AvailableActions {
  if (state.isFinished) {
    return {
      canAttack: false,
      canDefend: false,
      canThrowIn: false,
      canTransfer: false,
      canTake: false,
      canFinish: false,
    };
  }
  if (!state.currentPlayer.isActive) {
    return {
      canAttack: false,
      canDefend: false,
      canThrowIn: false,
      canTransfer: false,
      canTake: false,
      canFinish: false,
    };
  }
  const hasSelection = !!selectedCard;
  return {
    canAttack: state.phase === 'attack' && hasSelection,
    canDefend: state.phase === 'defense' && hasSelection,
    canThrowIn: state.phase === 'attack' && hasSelection,
    canTransfer: state.phase === 'defense' && hasSelection,
    canTake: state.phase === 'defense' && !hasSelection,
    canFinish: state.phase === 'cleanup',
  };
}

export function computeHint(state: GameTableState, actions: AvailableActions, hasSelection: boolean): string {
  if (state.isFinished) return 'Матч завершён';
  if (state.phase === 'attack') {
    if (!hasSelection) return 'Ваш ход: выберите карту для атаки';
    if (actions.canAttack) return 'Нажмите «Атаковать», чтобы походить выбранной картой';
    return 'Выберите другую карту для атаки';
  }
  if (state.phase === 'defense') {
    if (!hasSelection && actions.canTake) return 'Можно взять карты со стола или выбрать карту для защиты';
    if (!hasSelection) return 'Вы защищаетесь: выберите карту, чтобы побить';
    if (actions.canDefend) return 'Нажмите «Защититься» выбранной картой';
    if (actions.canTake) return 'Этой картой нельзя защититься — можно взять карты';
    return 'Выберите другую карту для защиты';
  }
  if (state.phase === 'cleanup') {
    if (actions.canFinish) return 'Раунд завершён, можно нажать «Бито»';
    return 'Идёт завершение раунда';
  }
  if (state.phase === 'waiting') return 'Ожидание хода другого игрока';
  return 'Ожидание следующего шага';
}

export function isWaiting(state: GameTableState, actions: AvailableActions): boolean {
  if (state.isFinished) return false;
  if (state.phase === 'waiting') return true;
  const noActions =
    !actions.canAttack &&
    !actions.canDefend &&
    !actions.canThrowIn &&
    !actions.canTransfer &&
    !actions.canTake &&
    !actions.canFinish;
  return noActions;
}

/** True when the active player is a bot (current user is not active and an opponent bot is active). */
export function isBotTurn(state: GameTableState): boolean {
  if (state.isFinished) return false;
  if (state.currentPlayer.isActive) return false;
  return state.opponents.some((o) => o.isActive && o.isBot);
}

