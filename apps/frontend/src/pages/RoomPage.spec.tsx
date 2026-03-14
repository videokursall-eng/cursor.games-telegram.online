import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { RoomPage } from './RoomPage';

vi.mock('../api/rooms', () => {
  const getRoom = vi.fn(async () => ({
    id: 'r1',
    mode: 'podkidnoy',
    maxPlayers: 2,
    ownerId: 'u1',
    status: 'lobby',
    isPrivate: false,
    inviteCode: 'CODE',
    players: [{ id: 'u1', name: 'Owner', isBot: false, isOwner: true }],
    bots: [],
    turnTimeoutMs: 30000,
    turnStartedAt: Date.now(),
  }));

  const updateRoomTimeouts = vi.fn(async () => ({
    id: 'r1',
    mode: 'podkidnoy',
    maxPlayers: 2,
    ownerId: 'u1',
    status: 'lobby',
    isPrivate: false,
    inviteCode: 'CODE',
    players: [{ id: 'u1', name: 'Owner', isBot: false, isOwner: true }],
    bots: [],
    turnTimeoutMs: 15000,
    overrideTurnTimeoutMs: 15000,
    perPlayerTimeoutMs: { u1: 5000 },
  }));

  const updateBotProfile = vi.fn(async () => ({
    id: 'r1',
    mode: 'podkidnoy',
    maxPlayers: 2,
    ownerId: 'u1',
    status: 'lobby',
    isPrivate: false,
    inviteCode: 'CODE',
    players: [{ id: 'u1', name: 'Owner', isBot: false, isOwner: true }],
    bots: [
      {
        id: 'bot-r1-0',
        name: 'Bot 1',
        isBot: true,
        isOwner: false,
        botProfile: { profileId: 'hard-0', strategyId: 'basic', difficulty: 'hard' },
      },
    ],
    turnTimeoutMs: 30000,
  }));

  return {
    getRoom,
    leaveRoom: vi.fn(async () => null),
    startRoomMatch: vi.fn(async () => null),
    updateRoomTimeouts,
    updateBotProfile,
  };
});

import * as roomsApi from '../api/rooms';

vi.mock('../store/authStore', () => {
  return {
    useAuthStore: (selector: (s: { accessToken: string | null; user: { id: string } | null }) => unknown) =>
      selector({ accessToken: 'token', user: { id: 'u1' } }),
  };
});

describe('RoomPage timeout settings', () => {
  it('renders timeout controls for owner and allows saving overrides', async () => {
    render(
      <MemoryRouter initialEntries={['/room/r1']}>
        <Routes>
          <Route path="/room/:roomId" element={<RoomPage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByText(/Комната #r1/)).toBeInTheDocument();
    expect(await screen.findByText(/Тайм-ауты хода/)).toBeInTheDocument();
    expect(await screen.findByText(/Текущий эффективный тайм-аут: 30 сек\./)).toBeInTheDocument();

    const roomTimeoutInput = screen.getByLabelText('room-timeout-seconds') as HTMLInputElement;
    fireEvent.change(roomTimeoutInput, { target: { value: '15' } });

    const ownerTimeoutInput = screen.getByLabelText('timeout-u1') as HTMLInputElement;
    fireEvent.change(ownerTimeoutInput, { target: { value: '5' } });

    const saveButton = screen.getByText(/Сохранить тайм-ауты/);
    fireEvent.click(saveButton);

    expect(roomsApi.updateRoomTimeouts).toHaveBeenCalledWith(
      'r1',
      { roomTimeoutMs: 15000, perPlayerTimeoutMs: { u1: 5000 } },
      'token',
    );

    expect(await screen.findByText(/Текущий эффективный тайм-аут: 15 сек\./)).toBeInTheDocument();
  });

  it('shows bot difficulty and owner can change it', async () => {
    (roomsApi.getRoom as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      id: 'r1',
      mode: 'podkidnoy',
      maxPlayers: 2,
      ownerId: 'u1',
      status: 'lobby',
      isPrivate: false,
      inviteCode: 'CODE',
      players: [{ id: 'u1', name: 'Owner', isBot: false, isOwner: true }],
      bots: [
        {
          id: 'bot-r1-0',
          name: 'Bot 1',
          isBot: true,
          isOwner: false,
          botProfile: { profileId: 'easy-0', strategyId: 'basic', difficulty: 'easy' },
        },
      ],
      turnTimeoutMs: 30000,
    });

    render(
      <MemoryRouter initialEntries={['/room/r1']}>
        <Routes>
          <Route path="/room/:roomId" element={<RoomPage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByText(/Бот · Лёгкий/)).toBeInTheDocument();
    const select = screen.getByLabelText(/Сложность бота Bot 1/);
    expect(select).toBeInTheDocument();

    fireEvent.change(select, { target: { value: 'hard' } });

    await waitFor(() =>
      expect(roomsApi.updateBotProfile).toHaveBeenCalledWith(
        'r1',
        'bot-r1-0',
        { difficulty: 'hard' },
        'token',
      ),
    );
    await waitFor(() => expect(screen.getByText(/Бот · Сложный/)).toBeInTheDocument());
  });
});

describe('RoomPage in_progress', () => {
  it('shows "К столу" and navigates to game table when status is in_progress', async () => {
    (roomsApi.getRoom as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      id: 'r1',
      mode: 'podkidnoy',
      maxPlayers: 2,
      ownerId: 'u1',
      status: 'in_progress',
      isPrivate: false,
      inviteCode: 'CODE',
      players: [{ id: 'u1', name: 'Owner', isBot: false, isOwner: true }],
      bots: [{ id: 'bot-1', name: 'Bot 1', isBot: true, isOwner: false, botProfile: { profileId: 'p1', strategyId: 'basic', difficulty: 'normal' } }],
    });

    render(
      <MemoryRouter initialEntries={['/room/r1']}>
        <Routes>
          <Route path="/room/:roomId" element={<RoomPage />} />
          <Route path="/room/:roomId/game" element={<div data-testid="game-table-page">Game Table</div>} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByText(/Игра запущена/)).toBeInTheDocument();
    const toTableButton = screen.getByText('К столу');
    expect(toTableButton).toBeInTheDocument();

    fireEvent.click(toTableButton);

    await waitFor(() => {
      expect(screen.getByTestId('game-table-page')).toBeInTheDocument();
      expect(screen.getByText('Game Table')).toBeInTheDocument();
    });
  });
});

