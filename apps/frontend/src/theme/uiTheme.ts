export type UiThemeId = 'default' | 'brand';

export type PendingIndicatorVisualVariant = 'inline' | 'button' | 'status';

export interface PendingIndicatorTheme {
  dotSize: { sm: string; md: string };
  colors: Record<PendingIndicatorVisualVariant, string>;
  animationClass: string;
}

export interface StatusToneToken {
  textColor: string;
  badgeBg: string;
}

export interface StatusPillTheme {
  syncing: StatusToneToken;
  reconnecting: StatusToneToken;
  stale: StatusToneToken;
  waiting: StatusToneToken;
  pending: StatusToneToken;
  active: StatusToneToken;
}

export interface ReconnectBannerTheme {
  background: string;
  textColor: string;
  buttonBg: string;
  buttonTextColor: string;
}

export interface ActionButtonStateTheme {
  base: string;
  disabled: string;
  pending: string;
}

export interface ActionButtonTheme {
  primary: ActionButtonStateTheme;
  secondary: ActionButtonStateTheme;
  danger: ActionButtonStateTheme;
}

export interface UiTheme {
  id: UiThemeId;
  pendingIndicator: PendingIndicatorTheme;
  statusPill: StatusPillTheme;
  reconnectBanner: ReconnectBannerTheme;
  actionButton: ActionButtonTheme;
}

const defaultPendingIndicator: PendingIndicatorTheme = {
  dotSize: { sm: 'h-1.5 w-1.5', md: 'h-2 w-2' },
  colors: {
    inline: 'bg-emerald-200',
    button: 'bg-emerald-100',
    status: 'bg-sky-300',
  },
  animationClass: 'animate-bounce',
};

const brandPendingIndicator: PendingIndicatorTheme = {
  dotSize: { sm: 'h-1.5 w-1.5', md: 'h-2 w-2' },
  colors: {
    inline: 'bg-emerald-300',
    button: 'bg-emerald-50',
    status: 'bg-sky-300',
  },
  animationClass: 'animate-bounce',
};

const themes: Record<UiThemeId, UiTheme> = {
  default: {
    id: 'default',
    pendingIndicator: defaultPendingIndicator,
    statusPill: {
      syncing: { textColor: 'text-emerald-300', badgeBg: 'bg-emerald-900/40' },
      reconnecting: { textColor: 'text-amber-300', badgeBg: 'bg-emerald-900/40' },
      stale: { textColor: 'text-amber-400', badgeBg: 'bg-emerald-900/40' },
      waiting: { textColor: 'text-emerald-200', badgeBg: 'bg-emerald-900/40' },
      pending: { textColor: 'text-sky-300', badgeBg: 'bg-emerald-900/40' },
      active: { textColor: 'text-emerald-200', badgeBg: 'bg-emerald-900/40' },
    },
    reconnectBanner: {
      background: 'bg-amber-900/80',
      textColor: 'text-amber-50',
      buttonBg: 'bg-amber-700',
      buttonTextColor: 'text-amber-50',
    },
    actionButton: {
      primary: {
        base: 'bg-emerald-700 text-white',
        disabled: 'bg-emerald-950/60 text-emerald-300/40',
        pending: 'bg-emerald-800 text-emerald-100',
      },
      secondary: {
        base: 'bg-emerald-900/40 text-emerald-100',
        disabled: 'bg-emerald-950/40 text-emerald-700/60',
        pending: 'bg-emerald-900/60 text-emerald-100',
      },
      danger: {
        base: 'bg-rose-700 text-rose-50',
        disabled: 'bg-rose-950/60 text-rose-300/40',
        pending: 'bg-rose-800 text-rose-100',
      },
    },
  },
  brand: {
    id: 'brand',
    pendingIndicator: brandPendingIndicator,
    statusPill: {
      syncing: { textColor: 'text-emerald-300', badgeBg: 'bg-emerald-900/40' },
      reconnecting: { textColor: 'text-amber-300', badgeBg: 'bg-emerald-900/40' },
      stale: { textColor: 'text-amber-400', badgeBg: 'bg-emerald-900/40' },
      waiting: { textColor: 'text-emerald-200', badgeBg: 'bg-emerald-900/40' },
      pending: { textColor: 'text-sky-300', badgeBg: 'bg-emerald-900/40' },
      active: { textColor: 'text-emerald-200', badgeBg: 'bg-emerald-900/40' },
    },
    reconnectBanner: {
      background: 'bg-amber-900/80',
      textColor: 'text-amber-50',
      buttonBg: 'bg-amber-700',
      buttonTextColor: 'text-amber-50',
    },
    actionButton: {
      primary: {
        base: 'bg-emerald-700 text-white',
        disabled: 'bg-emerald-950/60 text-emerald-300/40',
        pending: 'bg-emerald-800 text-emerald-100',
      },
      secondary: {
        base: 'bg-emerald-900/40 text-emerald-100',
        disabled: 'bg-emerald-950/40 text-emerald-700/60',
        pending: 'bg-emerald-900/60 text-emerald-100',
      },
      danger: {
        base: 'bg-rose-700 text-rose-50',
        disabled: 'bg-rose-950/60 text-rose-300/40',
        pending: 'bg-rose-800 text-rose-100',
      },
    },
  },
};

function resolveThemeId(explicitId?: UiThemeId): UiThemeId {
  if (explicitId && themes[explicitId]) return explicitId;
  const envId = (typeof import.meta !== 'undefined' && (import.meta as unknown as { env?: Record<string, string> })?.env)
    ? ((import.meta as unknown as { env: Record<string, string> }).env.VITE_UI_THEME as UiThemeId | undefined)
    : undefined;
  if (envId && themes[envId]) return envId;
  return 'brand';
}

export function getUiTheme(id?: UiThemeId): UiTheme {
  const resolved = resolveThemeId(id);
  return themes[resolved] ?? themes.brand;
}

