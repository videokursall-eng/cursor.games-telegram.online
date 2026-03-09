import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";

interface Member {
  userId: number | null;
  seatIndex: number;
  role: string;
  status: string;
}

interface RoomState {
  roomId: string;
  status: string;
  variant: string;
  maxPlayers: number;
  members: Member[];
  isPrivate: boolean;
  inviteToken: string | null | undefined;
}

export const PrivateRoomPage: React.FC = () => {
  const { roomId } = useParams();
  const [state, setState] = useState<RoomState | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!roomId) return;
      try {
        const res = await axios.get(`/api/room/state/${roomId}`);
        if (!cancelled) setState(res.data as RoomState);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [roomId]);

  if (loading || !state) {
    return <div>Загрузка комнаты...</div>;
  }

  const inviteCode = state.inviteToken ?? "—";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <h2 style={{ fontSize: 20, fontWeight: 600 }}>Приватная комната</h2>
      <div
        style={{
          padding: 12,
          borderRadius: 16,
          background: "rgba(15,23,42,0.7)",
          border: "1px dashed rgba(148,163,184,0.5)",
          fontSize: 14,
        }}
      >
        Код приглашения: <strong>{inviteCode}</strong>
      </div>
    </div>
  );
};

