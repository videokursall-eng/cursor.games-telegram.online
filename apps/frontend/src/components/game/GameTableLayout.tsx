import type { ReactNode } from 'react';

interface GameTableLayoutProps {
  opponents: ReactNode;
  battle: ReactNode;
  deck: ReactNode;
  hand: ReactNode;
  actions: ReactNode;
  statusBar: ReactNode;
}

export function GameTableLayout({ opponents, battle, deck, hand, actions, statusBar }: GameTableLayoutProps) {
  return (
    <div className="flex h-full flex-col bg-gradient-to-br from-emerald-900 to-emerald-950">
      <div className="px-3 pt-2 pb-1 text-[11px] text-gray-200">{statusBar}</div>
      <div className="flex-1 px-3 pb-2">
        <div className="flex h-full flex-col gap-2">
          <div className="flex-1 rounded-xl border border-emerald-700/70 bg-emerald-900/70 p-2">
            {opponents}
          </div>
          <div className="flex h-[40%] gap-2">
            <div className="flex-1 rounded-xl border border-emerald-700/70 bg-emerald-900/80 p-2 flex items-center justify-center">
              {battle}
            </div>
            <div className="w-20 rounded-xl border border-emerald-700/70 bg-emerald-900/80 p-2 flex flex-col items-center justify-between">
              {deck}
            </div>
          </div>
          <div className="h-[26%] rounded-xl border border-emerald-700/70 bg-emerald-900/90 p-2 flex flex-col gap-2">
            <div className="flex-1 flex items-center justify-center overflow-x-auto">{hand}</div>
            <div className="h-10 flex items-center justify-center gap-2">{actions}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

