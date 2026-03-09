import request from "supertest";
import { io as Client } from "socket.io-client";
import { createApp } from "../../src/app";
import jwt from "jsonwebtoken";
import { config } from "../../src/config";

function createTestToken(userId: number): string {
  return jwt.sign({ sub: userId }, config.jwtSecret, { expiresIn: "5m" });
}

describe("Realtime reconnect and backend restart safety", () => {
  it("allows client to reconnect after disconnect", async () => {
    const { app, httpServer } = await createApp();

    const token = createTestToken(1);
    const addr = await new Promise<string>((resolve) => {
      const server = httpServer.listen(0, () => {
        const address = server.address();
        if (typeof address === "string" || !address) {
          resolve("http://127.0.0.1");
        } else {
          resolve(`http://127.0.0.1:${address.port}`);
        }
      });
    });

    const client1 = Client(addr, {
      path: "/realtime",
      transports: ["polling"],
      auth: { token },
    });

    await new Promise<void>((resolve) => {
      client1.on("connect", () => resolve());
    });

    client1.disconnect();

    const client2 = Client(addr, {
      path: "/realtime",
      transports: ["polling"],
      auth: { token },
    });

    await new Promise<void>((resolve) => {
      client2.on("connect", () => resolve());
    });

    client2.disconnect();
    httpServer.close();
  });

  it("keeps HTTP /api/health working after quick restart simulation", async () => {
    const { app, httpServer } = await createApp();

    const res1 = await request(app).get("/api/health");
    expect(res1.status).toBe(200);

    httpServer.close();

    const { app: app2, httpServer: httpServer2 } = await createApp();
    const res2 = await request(app2).get("/api/health");
    expect(res2.status).toBe(200);

    httpServer2.close();
  });
});

