import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import type { Server, Socket } from 'socket.io';
import type { AuthSessionPayload } from 'shared';
import { RealtimeService } from './realtime.service';
import type { StructuredLoggerService } from '../logging/structured-logger.service';

function createMockServer() {
  const to = jest.fn().mockReturnThis();
  const emit = jest.fn();
  return { to, emit } as unknown as Server;
}

function createMockSocket(id: string): Socket {
  return {
    id,
    join: jest.fn(),
    leave: jest.fn(),
  } as unknown as Socket;
}

const session: AuthSessionPayload = {
  userId: 'user-1',
  telegramId: 123,
};

describe('RealtimeService', () => {
  let service: RealtimeService;
  let io: Server;
  let logger: StructuredLoggerService;

  beforeEach(() => {
    logger = {
      info: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
      error: jest.fn(),
    } as unknown as StructuredLoggerService;
    service = new RealtimeService(logger);
    io = createMockServer();
    service.setServer(io);
  });

  it('joins room and broadcasts snapshot', () => {
    const socket = createMockSocket('s1');
    const snap = service.joinRoom(socket, session, { roomId: 'room1' });
    expect(snap.roomId).toBe('room1');
    expect(snap.members).toContain('s1');
  });

  it('handles idempotent commands and logs duplicate_command', () => {
    const socket = createMockSocket('s1');
    service.joinRoom(socket, session, { roomId: 'room1' });

    const first = service.handleCommand(socket, session, {
      roomId: 'room1',
      clientCommandId: 'cmd-1',
      data: { x: 1 },
    });
    const second = service.handleCommand(socket, session, {
      roomId: 'room1',
      clientCommandId: 'cmd-1',
      data: { x: 1 },
    });

    expect(first).not.toBeNull();
    expect(second).not.toBeNull();
    expect(first!.seq).toBe(second!.seq);
    expect(logger.warn).toHaveBeenCalledWith(
      'duplicate_command',
      expect.objectContaining({
        roomId: 'room1',
        userId: session.userId,
        requestId: 'cmd-1',
      }),
    );
  });

  it('detects out-of-order message and does not advance seq', () => {
    const socket = createMockSocket('s1');
    service.joinRoom(socket, session, { roomId: 'room1' });

    const snap1 = service.handleCommand(socket, session, {
      roomId: 'room1',
      clientCommandId: 'cmd-1',
      data: { x: 1 },
      clientSeq: 0,
    })!;
    expect(snap1.seq).toBe(1);

    const snap2 = service.handleCommand(socket, session, {
      roomId: 'room1',
      clientCommandId: 'cmd-2',
      data: { x: 2 },
      clientSeq: 0,
    })!;

    expect(snap2.seq).toBe(1);
    expect(logger.warn).toHaveBeenCalledWith(
      'out_of_order_message',
      expect.objectContaining({
        roomId: 'room1',
        userId: session.userId,
        requestId: 'cmd-2',
        clientSeq: 0,
        serverSeq: 1,
      }),
    );
  });

  it('detects reconnect mismatch when clientSeq is ahead of server', () => {
    const socket = createMockSocket('s1');
    service.joinRoom(socket, session, { roomId: 'room1' });

    const snap1 = service.handleCommand(socket, session, {
      roomId: 'room1',
      clientCommandId: 'cmd-1',
      data: { x: 1 },
      clientSeq: 0,
    })!;
    expect(snap1.seq).toBe(1);

    const snap2 = service.handleCommand(socket, session, {
      roomId: 'room1',
      clientCommandId: 'cmd-2',
      data: { x: 2 },
      clientSeq: 5,
    })!;

    expect(snap2.seq).toBe(1);
    expect(logger.warn).toHaveBeenCalledWith(
      'reconnect_mismatch',
      expect.objectContaining({
        roomId: 'room1',
        userId: session.userId,
        requestId: 'cmd-2',
        clientSeq: 5,
        serverSeq: 1,
      }),
    );
  });
});

