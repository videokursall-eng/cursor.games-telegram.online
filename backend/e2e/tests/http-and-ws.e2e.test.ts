import request from "supertest";
import { io as clientIo, Socket } from "socket.io-client";
import jwt from "jsonwebtoken";
import { AddressInfo } from "net";
import { createApp } from "../../src/app";
import { config } from "../../src/config";

describe("E2E HTTP and WebSocket", () => {
  it("serves root / with 200", async () => {
    const { app, httpServer } = await createApp();
    const res = await request(app).get("/");
    expect(res.status).toBeGreaterThanOrEqual(200);
    expect(res.status).toBeLessThan(500);
    httpServer.close();
  });

  it("accepts Socket.IO handshake on /realtime", async () => {
    const { app, httpServer } = await createApp();
    const server = httpServer.listen(0);
    const address = server.address() as AddressInfo;
    const port = address.port;

    const token = jwt.sign(
      {
        sub: 1,
        tgId: 123456,
        username: "testuser",
      },
      config.jwtSecret,
      { expiresIn: 60 },
    );

    await new Promise<void>((resolve, reject) => {
      const socket: Socket = clientIo(`http://127.0.0.1:${port}`, {
        path: "/realtime",
        transports: ["websocket", "polling"],
        auth: { token },
      });

      const timer = setTimeout(() => {
        socket.close();
        reject(new Error("Socket.IO connection timeout"));
      }, 5000);

      socket.on("connect", () => {
        clearTimeout(timer);
        socket.close();
        resolve();
      });

      socket.on("connect_error", (err) => {
        clearTimeout(timer);
        socket.close();
        reject(err);
      });
    });

    server.close();
  });
});

