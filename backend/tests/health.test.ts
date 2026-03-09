import request from "supertest";
import { createApp } from "../src/app";

describe("HTTP health endpoints", () => {
  it("GET /api/health returns ok", async () => {
    const { app, httpServer } = await createApp();
    const res = await request(app).get("/api/health");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
    httpServer.close();
  });

  it("GET /healthz returns ok JSON", async () => {
    const { app, httpServer } = await createApp();
    const res = await request(app).get("/healthz");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: "ok" });
    httpServer.close();
  });
});

