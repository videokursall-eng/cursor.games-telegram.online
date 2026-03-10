import { io, Socket } from "socket.io-client";
import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { useAuth } from "./authContext";

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
  const { token } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [status, setStatus] = useState<ConnectionStatus>("disconnected");

  useEffect(() => {
    if (!token) {
      setSocket(null);
      setStatus("disconnected");
      return;
    }

    const s = io("/", {
      path: "/realtime",
      transports: ["websocket", "polling"],
      autoConnect: false,
      auth: { token },
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
      setSocket(null);
      setStatus("disconnected");
    };
  }, [token]);

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

