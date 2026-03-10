import React from "react";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { vi } from "vitest";
import { App } from "./App";

vi.mock("../modules/auth/useTelegramAuth", () => ({
  useTelegramAuth: () => ({
    loading: false,
    error: undefined,
    token: "test-token",
    user: { id: 1, username: "testuser" },
    activeMatchId: null,
  }),
}));

describe("App fallback without WebSocket", () => {
  it("renders lobby over HTTP-only bootstrap", () => {
    render(
      <MemoryRouter initialEntries={["/"]}>
        <App />
      </MemoryRouter>,
    );

    expect(screen.getByText(/WebSocket не обязателен для загрузки этой страницы/)).toBeInTheDocument();
    expect(screen.getByText(/Создать комнату/)).toBeInTheDocument();
  });
});

