import { redis, getRedis, initRedis, closeRedis } from "../src/infrastructure/redis";

describe("Redis", () => {
  afterEach(async () => {
    await closeRedis();
  });

  it("getRedis returns null when not initialized", () => {
    expect(getRedis()).toBeNull();
  });

  it("initRedis resolves in test env without connecting", async () => {
    await expect(initRedis()).resolves.toBeUndefined();
    expect(getRedis()).toBeNull();
  });
});
