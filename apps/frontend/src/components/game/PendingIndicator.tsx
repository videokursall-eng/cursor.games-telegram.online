import { getUiTheme, type PendingIndicatorVisualVariant } from '../../theme/uiTheme';

interface PendingIndicatorProps {
  size?: 'sm' | 'md';
  variant?: PendingIndicatorVisualVariant;
  ariaLabel?: string;
}

export function PendingIndicator({ size = 'sm', variant = 'inline', ariaLabel }: PendingIndicatorProps) {
  const theme = getUiTheme().pendingIndicator;
  const dotSize = theme.dotSize[size];
  const color = theme.colors[variant];

  return (
    <span
      aria-label={ariaLabel ?? 'pending-indicator'}
      data-testid="pending-indicator"
      className="inline-flex items-center gap-[2px]"
    >
      {[0, 1, 2].map((i) => (
        // eslint-disable-next-line react/no-array-index-key
        <span
          key={i}
          className={`${dotSize} rounded-full ${color} ${theme.animationClass}`}
          style={{ animationDelay: `${i * 0.12}s` }}
        />
      ))}
    </span>
  );
}

