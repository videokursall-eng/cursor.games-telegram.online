import { PendingIndicator } from './PendingIndicator';
import { getUiTheme } from '../../theme/uiTheme';

interface ActionPanelProps {
  canAttack: boolean;
  canDefend: boolean;
  canThrowIn: boolean;
  canTransfer: boolean;
  canTake: boolean;
  canFinish: boolean;
  pendingAction?: string | null;
  onAttack: () => void;
  onDefend: () => void;
  onThrowIn: () => void;
  onTransfer: () => void;
  onTake: () => void;
  onFinish: () => void;
}

export function ActionPanel({
  canAttack,
  canDefend,
  canThrowIn,
  canTransfer,
  canTake,
  canFinish,
  pendingAction,
  onAttack,
  onDefend,
  onThrowIn,
  onTransfer,
  onTake,
  onFinish,
}: ActionPanelProps) {
  const {
    actionButton: { primary: primaryButton },
  } = getUiTheme();

  const btn = (label: string, enabled: boolean, loading: boolean, onClick?: () => void) => {
    const baseClasses =
      'inline-flex items-center justify-center gap-1 rounded px-2 py-1 text-[11px] transition-colors';
    const palette = loading
      ? primaryButton.pending
      : enabled
        ? primaryButton.base
        : primaryButton.disabled;
    return (
      <button
        key={label}
        type="button"
        disabled={!enabled || loading}
        onClick={enabled && !loading && onClick ? onClick : undefined}
        className={`${baseClasses} ${palette}`}
      >
        {loading && <PendingIndicator size="sm" variant="button" />}
        <span>{label}</span>
      </button>
    );
  };

  return (
    <div className="flex flex-wrap items-center justify-center gap-2">
      {btn('Атаковать', canAttack, pendingAction === 'attack', onAttack)}
      {btn('Защититься', canDefend, pendingAction === 'defend', onDefend)}
      {btn('Подкинуть', canThrowIn, pendingAction === 'throwIn', onThrowIn)}
      {btn('Перевести', canTransfer, pendingAction === 'transfer', onTransfer)}
      {btn('Взять', canTake, pendingAction === 'take', onTake)}
      {btn('Бито', canFinish, pendingAction === 'finish', onFinish)}
    </div>
  );
}

