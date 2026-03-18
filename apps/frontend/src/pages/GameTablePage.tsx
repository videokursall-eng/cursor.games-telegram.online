import { useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { GameTableLayout } from '../components/game/GameTableLayout';
import { OpponentRow } from '../components/game/OpponentRow';
import { BattleZone } from '../components/game/BattleZone';
import { DeckView } from '../components/game/DeckView';
import { PlayerHand } from '../components/game/PlayerHand';
import { ActionPanel } from '../components/game/ActionPanel';
import { GameStatusBar } from '../components/game/GameStatusBar';
import { ReconnectBanner } from '../components/game/ReconnectBanner';
import { useGameTableState } from '../features/game/useGameTableState';
import { useAvailableActions } from '../features/game/useAvailableActions';
import type { GameCard } from '../features/game/adapters';
import { computeHint, isWaiting, isBotTurn } from '../features/game/selectors';
import { useGameActions } from '../features/game/useGameActions';
import { MatchResultModal } from '../components/game/MatchResultModal';

export function GameTablePage() {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const { state, meta, refetch } = useGameTableState(roomId);
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);

  const selectedCard: GameCard | null = useMemo(
    () => state?.hand.find((c: GameCard) => c.id === selectedCardId) ?? null,
    [state, selectedCardId],
  );

  const actions = useAvailableActions(state ?? null, selectedCard);
  const { sendAction, pending, error: actionError } = useGameActions(roomId, refetch);
  const baseHint = state
    ? computeHint(state, actions, !!selectedCard)
    : meta.error ?? (meta.loading ? 'Загрузка матча…' : 'Состояние матча недоступно');
  const hint = state?.systemMessage ? state.systemMessage : baseHint;
  const waiting = state ? isWaiting(state, actions) : false;
  const botTurn = state ? isBotTurn(state) : false;

  // Сбрасываем выделенную карту, если она исчезла из руки после пересинхронизации.
  if (state && selectedCardId && !state.hand.some((c) => c.id === selectedCardId)) {
    // eslint-disable-next-line no-console
    setSelectedCardId(null);
  }

  if (meta.loading && !state) {
    return (
      <GameTableLayout
        opponents={<div className="text-xs text-emerald-100/80">Загрузка соперников…</div>}
        battle={<div className="text-xs text-emerald-100/80">Загрузка стола…</div>}
        deck={<div className="text-xs text-emerald-100/80">Загрузка колоды…</div>}
        hand={<div className="text-xs text-emerald-100/80">Загрузка руки…</div>}
        actions={<div className="text-xs text-emerald-100/80">Инициализация действий…</div>}
        statusBar={<GameStatusBar currentPlayerName="…" phase="…" hint={hint} />}
      />
    );
  }

  if (meta.error && !state) {
    return (
      <div className="flex h-full flex-col items-center justify-center bg-emerald-950 px-4">
        <p className="mb-1 text-sm text-emerald-50">Ошибка: {meta.error}</p>
        {actionError && (
          <p className="mb-2 text-xs text-red-300">
            Ошибка действия: {actionError}
          </p>
        )}
        <div className="flex gap-2">
          <button
            type="button"
            className="rounded bg-emerald-700 px-3 py-2 text-xs"
            onClick={() => refetch()}
          >
            Повторить
          </button>
          <button
            type="button"
            className="rounded bg-gray-800 px-3 py-2 text-xs"
            onClick={() => navigate('/')}
          >
            В лобби
          </button>
        </div>
      </div>
    );
  }

  if (!state) {
    return (
      <div className="flex h-full flex-col items-center justify-center bg-emerald-950 px-4 text-xs text-emerald-100/80">
        <p>Состояние матча временно недоступно.</p>
        {actionError && (
          <p className="mt-1 text-[11px] text-red-300">
            Ошибка действия: {actionError}
          </p>
        )}
        <button
          type="button"
          className="mt-3 rounded bg-emerald-700 px-3 py-2"
          onClick={() => refetch()}
        >
          Обновить
        </button>
      </div>
    );
  }

  const opponents = state.opponents.map((o) => ({
    id: o.id,
    name: o.name,
    cards: o.cardCount,
    isBot: o.isBot,
    isActive: o.isActive,
  }));

  const battlePairs = state.battlePairs.map((p) => ({
    attack: { rank: p.attack.rank, suit: p.attack.suit },
    defense: p.defense ? { rank: p.defense.rank, suit: p.defense.suit } : undefined,
  }));

  const handCards = state.hand.map((c: GameCard) => ({
    id: c.id,
    rank: c.rank,
    suit: c.suit,
    disabled: !c.playable,
  }));

  return (
    <>
      {(meta.offline || meta.reconnecting || meta.stale || (meta.error && state)) && (
        <div className="bg-emerald-950 px-3 pt-2">
          <ReconnectBanner
            offline={meta.offline}
            reconnecting={meta.reconnecting}
            stale={meta.stale}
            error={meta.error}
            onRetry={() => {
              void refetch();
            }}
          />
        </div>
      )}
      <GameTableLayout
        opponents={<OpponentRow opponents={opponents} />}
        battle={<BattleZone pairs={battlePairs} />}
        deck={<DeckView cardsLeft={state.deckCount} trump={{ rank: state.trump.rank, suit: state.trump.suit }} />}
        hand={<PlayerHand cards={handCards} selectedId={selectedCardId} onSelect={setSelectedCardId} />}
        actions={
          !state.isFinished ? (
            <ActionPanel
              canAttack={actions.canAttack}
              canDefend={actions.canDefend}
              canThrowIn={actions.canThrowIn}
              canTransfer={actions.canTransfer}
              canTake={actions.canTake}
              canFinish={actions.canFinish}
              pendingAction={pending}
              onAttack={() => {
                if (selectedCard) {
                  void sendAction({ type: 'attack', card: { rank: selectedCard.rank, suit: selectedCard.suit } });
                }
              }}
              onDefend={() => {
                if (selectedCard) {
                  void sendAction({
                    type: 'defend',
                    card: { rank: selectedCard.rank, suit: selectedCard.suit },
                    attackIndex: 0,
                  });
                }
              }}
              onThrowIn={() => {
                if (selectedCard) {
                  void sendAction({ type: 'throwIn', card: { rank: selectedCard.rank, suit: selectedCard.suit } });
                }
              }}
              onTransfer={() => {
                if (selectedCard) {
                  void sendAction({ type: 'transfer', card: { rank: selectedCard.rank, suit: selectedCard.suit } });
                }
              }}
              onTake={() => {
                void sendAction({ type: 'take' });
              }}
              onFinish={() => {
                void sendAction({ type: 'finish' });
              }}
            />
          ) : null
        }
        statusBar={
          <GameStatusBar
            currentPlayerName={state.currentPlayer.name}
            phase={state.phase}
            hint={hint}
            syncing={meta.syncing}
            waiting={waiting}
            reconnecting={meta.reconnecting}
            stale={meta.stale}
            actionPending={!!pending}
            turnStartedAt={state.turnStartedAt}
            turnDurationSeconds={state.turnDurationSeconds}
            isCurrentPlayerActive={state.currentPlayer.isActive}
            isFinished={state.isFinished}
            isBotTurn={botTurn}
          />
        }
      />
      <MatchResultModal
        visible={state.isFinished}
        currentPlayerId={state.currentPlayer.id}
        mode={state.mode}
        players={[
          { id: state.currentPlayer.id, name: state.currentPlayer.name, isBot: state.currentPlayer.isBot },
          ...state.opponents.map((o) => ({ id: o.id, name: o.name, isBot: o.isBot })),
        ]}
        matchResult={state.matchResult ?? null}
        onExitToLobby={() => navigate('/')}
        onExitToRoom={() => navigate(`/room/${state.roomId}`)}
      />
    </>
  );
}

