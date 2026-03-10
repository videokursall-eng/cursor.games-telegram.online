import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { vi } from "vitest";
import axios from "axios";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { CreateRoomPage } from "../CreateRoomPage";

vi.mock("axios");

const mockedAxios = axios as unknown as {
  post: ReturnType<typeof vi.fn>;
};

describe("CreateRoomPage", () => {
  it("submits correct payload for room creation", async () => {
    mockedAxios.post = vi.fn().mockResolvedValueOnce({
      data: { roomId: "00000000-0000-0000-0000-000000000001" },
    } as any);

    render(
      <MemoryRouter initialEntries={["/rooms/create"]}>
        <Routes>
          <Route path="/rooms/create" element={<CreateRoomPage />} />
          <Route path="/rooms/private/:roomId" element={<div>ROOM PAGE</div>} />
        </Routes>
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByText("Классический"));
    fireEvent.click(screen.getByRole("button", { name: "4" })); // maxPlayers
    fireEvent.click(screen.getAllByRole("button", { name: "2" })[1]); // botCount

    fireEvent.click(screen.getAllByRole("button", { name: "Создать комнату" })[0]);

    expect(mockedAxios.post).toHaveBeenCalledWith("/api/room/create", {
      variant: "classic",
      maxPlayers: 4,
      isPrivate: true,
      botCount: 2,
    });
  });
});

