import request from "supertest";
import { createApp } from "../src/app";
import { config } from "../src/config";

describe("server startup", () => {
  it("starts without env.js error and serves /api/health", async () => {
    expect(config.port).toBe(4000);

    const { app, httpServer } = await createApp();

    const res = await request(app).get("/api/health");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });

    httpServer.close();
  });
});

