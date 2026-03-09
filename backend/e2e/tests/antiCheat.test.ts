import { AddressInfo } from "net";
import jwt from "jsonwebtoken";
import { io as Client, Socket } from "socket.io-client";
import { createApp } from "../../src/app";
import { config } from "../../src/config";

describe("Anti-cheat via Socket.IO command", () => {
  it("rejects command with short id as SUSPICIOUS_ID", async () => {
    const { app, httpServer } = await createApp();
    const server = httpServer.listen(0);
    const address = server.address() as AddressInfo;
    const port = address.port;

    const token = jwt.sign({ sub: 1 }, config.jwtSecret, { expiresIn: 60 });

    await new Promise<void>((resolve, reject) => {
      const socket: Socket = Client(`http://127.0.0.1:${port}`, {
        path: "/realtime",
        transports: ["polling"],
        auth: { token },
      });

      socket.on("connect", () => {
        socket.emit(
          "command",
          {
            id: "short",
            matchId: "test-match",
            type: "TEST",
            payload: {},
          },
          (ack: { ok: boolean; error?: string }) => {
            try {
              expect(ack.ok).toBe(false);
              expect(ack.error).toBe("SUSPICIOUS_ID");
              socket.close();
              server.close();
              resolve();
            } catch (err) {
              socket.close();
              server.close();
              reject(err);
            }
          },
        );
      });

      socket.on("connect_error", (err) => {
        socket.close();
        server.close();
        reject(err);
      });
    });
  });
});

