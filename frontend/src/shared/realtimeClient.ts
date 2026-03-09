import { io, Socket } from "socket.io-client";
import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

type ConnectionStatus = "disconnected" | "connecting" | "connected" | "reconnecting";

interface RealtimeContextValue {
  socket: Socket | null;
  status: ConnectionStatus;
}

const RealtimeContext = createContext<RealtimeContextValue>({
  socket: null,
  status: "disconnected",
});

export const RealtimeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [status, setStatus] = useState<ConnectionStatus>("disconnected");

  useEffect(() => {
    const s = io("/", {
      path: "/realtime",
      transports: ["websocket", "polling"],
      autoConnect: false,
    });

    setSocket(s);
    setStatus("connecting");
    s.connect();

    s.on("connect", () => setStatus("connected"));
    s.io.on("reconnect_attempt", () => setStatus("reconnecting"));
    s.io.on("reconnect", () => setStatus("connected"));
    s.on("disconnect", () => setStatus("disconnected"));

    return () => {
      s.removeAllListeners();
      s.close();
    };
  }, []);

  const value = useMemo(
    () => ({
      socket,
      status,
    }),
    [socket, status],
  );

  return React.createElement(RealtimeContext.Provider, { value }, children);
};

export function useRealtimeStatus(): ConnectionStatus {
  return useContext(RealtimeContext).status;
}

