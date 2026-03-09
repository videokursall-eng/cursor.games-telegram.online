import { rateLimit } from "../src/infrastructure/http/middlewares/rateLimit";

function createReq(ip: string): any {
  return { ip, headers: {} };
}

function createRes() {
  const res: any = {};
  res.statusCode = 200;
  res.body = null;
  res.status = (code: number) => {
    res.statusCode = code;
    return res;
  };
  res.json = (payload: unknown) => {
    res.body = payload;
    return res;
  };
  return res;
}

describe("rateLimit middleware", () => {
  it("returns 429 after many requests from same IP", () => {
    const ip = "1.1.1.1";
    let blocked = 0;
    for (let i = 0; i < 100; i += 1) {
      const req = createReq(ip);
      const res = createRes();
      let nextCalled = false;
      rateLimit(req, res, () => {
        nextCalled = true;
      });
      if (res.statusCode === 429) {
        blocked += 1;
        expect(res.body?.error?.code).toBe("RATE_LIMITED");
        break;
      }
      expect(nextCalled).toBe(true);
    }
    expect(blocked).toBe(1);
  });
});

