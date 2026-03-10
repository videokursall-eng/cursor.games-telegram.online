import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { vi } from "vitest";
import axios from "axios";
import { AuthProvider } from "../../../shared/authContext";
import { AuthGate } from "../AuthGate";

vi.mock("@twa-dev/sdk", () => ({
  default: {
    initData: "fake-init-data",
  },
}));

vi.mock("axios");

const mockedAxios = axios as unknown as {
  post: ReturnType<typeof vi.fn>;
};

describe("AuthGate", () => {
  it("renders children after successful Telegram auth via HTTP (no WebSocket required)", async () => {
    mockedAxios.post = vi.fn().mockResolvedValueOnce({
      data: {
        jwt: "test-token",
        user: { id: 1, username: "testuser" },
        activeMatchId: null,
      },
    }) as any;

    render(
      <AuthProvider>
        <AuthGate>
          <div>CONTENT</div>
        </AuthGate>
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(screen.getByText("CONTENT")).toBeInTheDocument();
    });

    expect(mockedAxios.post).toHaveBeenCalledWith("/api/auth/telegram/validate", {
      initData: "fake-init-data",
    });
    expect(axios.defaults.headers.common["Authorization"]).toBe("Bearer test-token");
  });
});


