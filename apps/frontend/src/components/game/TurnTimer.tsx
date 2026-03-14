import { useEffect, useState } from 'react';

interface TurnTimerProps {
  startedAt: number;
  durationSeconds: number;
}

export function TurnTimer({ startedAt, durationSeconds }: TurnTimerProps) {
  const [remaining, setRemaining] = useState<number>(() => {
    const deadline = startedAt + durationSeconds * 1000;
    return Math.max(0, Math.floor((deadline - Date.now()) / 1000));
  });

  useEffect(() => {
    const deadline = startedAt + durationSeconds * 1000;

    const update = () => {
      const next = Math.max(0, Math.floor((deadline - Date.now()) / 1000));
      setRemaining(next);
    };

    update();
    const id = window.setInterval(update, 500);
    return () => window.clearInterval(id);
  }, [startedAt, durationSeconds]);

  const minutes = Math.floor(remaining / 60);
  const seconds = remaining % 60;

  return (
    <span className="ml-1 inline-flex items-center rounded bg-emerald-900/60 px-1.5 py-0.5 font-mono text-[10px] text-emerald-200">
      {minutes.toString().padStart(2, '0')}:{seconds.toString().padStart(2, '0')}
    </span>
  );
}

