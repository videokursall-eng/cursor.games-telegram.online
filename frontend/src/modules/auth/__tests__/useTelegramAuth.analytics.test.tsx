import React from "react";
import { renderHook, waitFor } from "@testing-library/react";
import { vi } from "vitest";
import axios from "axios";
import WebApp from "@twa-dev/sdk";
import { useTelegramAuth } from "../useTelegramAuth";

vi.mock("axios");

vi.mock("@twa-dev/sdk", () => ({
  default: {
    initData: "fake-init-data",
  },
}));

const mockedAxios = axios as unknown as {
  post: ReturnType<typeof vi.fn>;
};

describe("useTelegramAuth analytics", () => {
  it("sends analytics on successful auth", async () => {
    mockedAxios.post = vi
      .fn()
      .mockResolvedValueOnce({
        data: {
          jwt: "ok",
          user: { id: 1, username: "u" },
          activeMatchId: null,
        },
      } as any)
      .mockResolvedValueOnce({ data: { ok: true } } as any);

    const { result } = renderHook(() => useTelegramAuth());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
      expect(result.current.user?.id).toBe(1);
    });

    expect(mockedAxios.post).toHaveBeenCalledWith("/api/auth/telegram/validate", {
      initData: WebApp.initData,
    });
    expect(mockedAxios.post).toHaveBeenCalledWith("/api/analytics/event", {
      type: "auth_success_frontend",
      payload: {
        userId: 1,
        username: "u",
      },
    });
  });

  it("sends analytics on failed auth", async () => {
    mockedAxios.post = vi
      .fn()
      .mockRejectedValueOnce(new Error("fail"))
      .mockResolvedValueOnce({ data: { ok: true } } as any);

    const { result } = renderHook(() => useTelegramAuth());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBeDefined();
    });

    expect(mockedAxios.post).toHaveBeenCalledWith("/api/analytics/event", {
      type: "auth_failed_frontend",
      payload: {
        message: expect.any(String),
      },
    });
  });
});

