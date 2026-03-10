import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { vi } from "vitest";
import axios from "axios";
import { LobbyPage } from "../LobbyPage";
import { AuthProvider } from "../../../shared/authContext";
import { MemoryRouter } from "react-router-dom";

vi.mock("axios");

const mockedAxios = axios as unknown as {
  get: ReturnType<typeof vi.fn>;
};

vi.mock("../../../shared/authContext", async () => {
  const real = await vi.importActual<typeof import("../../../shared/authContext")>("../../../shared/authContext");
  return {
    ...real,
    useAuth: () => ({
      token: "test-token",
      user: { id: 1, username: "testuser" },
      loading: false,
      error: undefined,
      refresh: () => {},
      activeMatchId: null,
    }),
  };
});

describe("LobbyPage", () => {
  it("renders main actions without technical text", async () => {
    mockedAxios.get = vi.fn().mockResolvedValueOnce({
      data: {
        rooms: [],
        userStats: { matchesPlayed: 0, matchesWon: 0, rating: 1000 },
        activeMatchId: null,
      },
    } as any);

    render(
      <MemoryRouter>
        <AuthProvider>
          <LobbyPage />
        </AuthProvider>
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText("Дурак онлайн")).toBeInTheDocument();
    });

    expect(screen.getByText("Быстрая игра")).toBeInTheDocument();
    expect(screen.getByText("Игра с ботами")).toBeInTheDocument();
    expect(screen.getByText("Создать комнату")).toBeInTheDocument();
    expect(screen.getByText("Войти по коду")).toBeInTheDocument();
    expect(screen.queryByText(/WebSocket не обязателен/)).toBeNull();
  });
});

