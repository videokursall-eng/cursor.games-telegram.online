import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { vi } from "vitest";
import axios from "axios";
import { StatsPage } from "../StatsPage";

vi.mock("axios");

const mockedAxios = axios as unknown as {
  get: ReturnType<typeof vi.fn>;
};

describe("StatsPage", () => {
  it("renders stats and leaderboard from API", async () => {
    mockedAxios.get = vi
      .fn()
      .mockResolvedValueOnce({
        data: {
          aggregates: [
            {
              period: "lifetime",
              bucketDate: "2025-01-01",
              matchesPlayed: 15,
              matchesWon: 9,
              avgTurnTimeMs: 0,
              maxStreak: 4,
            },
          ],
        },
      } as any)
      .mockResolvedValueOnce({
        data: {
          entries: [
            { userId: 1, username: "top1", rating: 1400, position: 1 },
            { userId: 2, username: "top2", rating: 1350, position: 2 },
          ],
        },
      } as any);

    render(<StatsPage />);

    await waitFor(() => {
      expect(screen.getByText("Игр сыграно")).toBeInTheDocument();
      expect(screen.getByText("15")).toBeInTheDocument();
      expect(screen.getByText("Побед")).toBeInTheDocument();
      expect(screen.getByText("9")).toBeInTheDocument();
      expect(screen.getByText("top1")).toBeInTheDocument();
    });
  });
});

