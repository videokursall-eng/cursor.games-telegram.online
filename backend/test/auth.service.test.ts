import crypto from "crypto";

jest.mock("../src/infrastructure/db", () => {
  const client = {
    query: jest.fn(),
    release: jest.fn(),
  };

  return {
    pgPool: {
      connect: jest.fn().mockResolvedValue(client),
    },
    __client: client,
  };
});

import { validateTelegramAndIssueJwt } from "../src/modules/auth/auth.service";
import { config } from "../src/config";
import * as dbModule from "../src/infrastructure/db";

describe("AuthService validateTelegramAndIssueJwt", () => {
  const botToken = "test-bot-token";

  beforeEach(() => {
    (config as any).telegramBotToken = botToken;
  });

  function buildInitData() {
    const user = {
      id: 123456,
      username: "testuser",
      first_name: "Test",
      last_name: "User",
    };
    const data: Record<string, string> = {
      user: JSON.stringify(user),
      auth_date: Math.floor(Date.now() / 1000).toString(),
    };
    const dataCheckString = Object.keys(data)
      .sort()
      .map((key) => `${key}=${data[key]}`)
      .join("\n");

    const secretKey = crypto
      .createHmac("sha256", "WebAppData")
      .update(botToken)
      .digest();
    const hash = crypto
      .createHmac("sha256", secretKey)
      .update(dataCheckString)
      .digest("hex");

    const params = new URLSearchParams({
      ...data,
      hash,
    });
    return params.toString();
  }

  it("creates or updates user in PostgreSQL and returns JWT", async () => {
    const initData = buildInitData();
    const client = (dbModule as any).__client;
    client.query.mockResolvedValueOnce({
      rows: [
        {
          id: 1,
          username: "testuser",
          first_name: "Test",
          last_name: "User",
        },
      ],
    });
    client.query.mockResolvedValueOnce({
      rows: [],
    });

    const result = await validateTelegramAndIssueJwt(initData);

    expect(result.user.id).toBe(1);
    expect(result.user.username).toBe("testuser");
    expect(typeof result.jwt).toBe("string");
    expect(client.query).toHaveBeenCalled();
  });
});

