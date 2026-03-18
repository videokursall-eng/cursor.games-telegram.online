import { useState } from 'react';

interface InviteLinkProps {
  roomId: string;
}

const BOT_USERNAME = import.meta.env.VITE_BOT_USERNAME || '<bot>';

export function InviteLink({ roomId }: InviteLinkProps) {
  const [copied, setCopied] = useState(false);
  const link = `https://t.me/${BOT_USERNAME}?startapp=room_${roomId}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // ignore
    }
  };

  return (
    <div className="mt-3 text-xs">
      <div className="mb-1 text-[11px] text-gray-400">Ссылка для приглашения</div>
      <div className="flex items-center gap-2">
        <div className="flex-1 truncate rounded bg-gray-900 px-2 py-1">{link}</div>
        <button
          type="button"
          onClick={handleCopy}
          className="rounded bg-gray-800 px-2 py-1 text-[11px]"
        >
          {copied ? 'Скопировано' : 'Копировать'}
        </button>
      </div>
    </div>
  );
}

