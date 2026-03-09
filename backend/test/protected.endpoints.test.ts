import request from "supertest";
import { createApp } from "../src/app";

describe("Protected endpoints", () => {
  it("GET /api/room/overview requires auth", async () => {
    const { app, httpServer } = await createApp();
    const res = await request(app).get("/api/room/overview");
    expect(res.status).toBe(401);
    httpServer.close();
  });
});


