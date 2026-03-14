import { getUiTheme } from '../../theme/uiTheme';

interface ReconnectBannerProps {
  offline: boolean;
  reconnecting: boolean;
  stale: boolean;
  error: string | null;
  onRetry: () => void;
}

export function ReconnectBanner({ offline, reconnecting, stale, error, onRetry }: ReconnectBannerProps) {
  const show = offline || reconnecting || stale || !!error;
  if (!show) return null;

  let label = '';
  if (offline) {
    label = 'Нет соединения. Попробуйте обновить состояние.';
  } else if (reconnecting) {
    label = 'Переподключение…';
  } else if (stale) {
    label = 'Состояние может быть устаревшим.';
  } else if (error) {
    label = `Ошибка: ${error}`;
  }

  const theme = getUiTheme().reconnectBanner;

  return (
    <div
      className={`mb-1 flex items-center justify-between rounded-md px-2 py-1 text-[11px] ${theme.background} ${theme.textColor}`}
    >
      <span className="mr-2 truncate">{label}</span>
      <button
        type="button"
        aria-label="retry-sync"
        className={`shrink-0 rounded px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${theme.buttonBg} ${theme.buttonTextColor}`}
        onClick={onRetry}
      >
        Пересинхронизировать
      </button>
    </div>
  );
}

