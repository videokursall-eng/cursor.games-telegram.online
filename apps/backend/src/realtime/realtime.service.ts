import { Injectable } from '@nestjs/common';
import type { Server, Socket } from 'socket.io';
import type { AuthSessionPayload } from 'shared';
import { StructuredLoggerService } from '../logging/structured-logger.service';

export interface JoinRoomPayload {
  roomId: string;
}

export interface HeartbeatPayload {
  clientTime: number;
  lastSeq?: number;
}

export interface CommandPayload {
  roomId: string;
  clientCommandId: string;
  data: unknown;
  /**
   * Optional client-side sequence/version that the command is based on.
   * Used to detect out-of-order and reconnect mismatch cases.
   */
  clientSeq?: number;
}

export interface RoomSnapshot {
  roomId: string;
  seq: number;
  members: string[];
  room?: unknown;
}

interface RoomState {
  seq: number;
  sockets: Set<string>;
  lastSnapshot: RoomSnapshot;
  processedCommands: Set<string>;
}

@Injectable()
export class RealtimeService {
  private io?: Server;
  private readonly rooms = new Map<string, RoomState>();

  constructor(private readonly logger: StructuredLoggerService) {}

  setServer(io: Server) {
    this.io = io;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  onClientConnected(_socket: Socket, _session: AuthSessionPayload): void {
    // Reserved for future presence tracking.
  }

  onClientDisconnected(socket: Socket): void {
    const socketId = socket.id;
    for (const [roomId, room] of this.rooms.entries()) {
      if (room.sockets.delete(socketId)) {
        room.seq += 1;
        room.lastSnapshot = {
          roomId,
          seq: room.seq,
          members: Array.from(room.sockets),
        };
        this.emitToRoom(roomId, 'room_snapshot', room.lastSnapshot, socketId);
      }
      if (room.sockets.size === 0) {
        this.rooms.delete(roomId);
      }
    }
  }

  joinRoom(socket: Socket, session: AuthSessionPayload, payload: JoinRoomPayload): RoomSnapshot {
    const { roomId } = payload;
    let room = this.rooms.get(roomId);
    if (!room) {
      room = {
        seq: 0,
        sockets: new Set(),
        lastSnapshot: { roomId, seq: 0, members: [], room: undefined },
        processedCommands: new Set(),
      };
      this.rooms.set(roomId, room);
      this.logger.info('realtime_room_state_created', {
        service: 'RealtimeService',
        roomId,
        userId: session.userId,
      });
    }
    room.sockets.add(socket.id);
    room.seq += 1;
    room.lastSnapshot = {
      roomId,
      seq: room.seq,
      members: Array.from(room.sockets),
      room: room.lastSnapshot.room,
    };
    socket.join(roomId);
    this.emitToRoom(roomId, 'room_snapshot', room.lastSnapshot, session.userId);
    this.logger.info('realtime_join_room', {
      service: 'RealtimeService',
      roomId,
      userId: session.userId,
      members: room.sockets.size,
    });
    return room.lastSnapshot;
  }

  leaveRoom(socket: Socket, session: AuthSessionPayload, payload: JoinRoomPayload): RoomSnapshot | null {
    const { roomId } = payload;
    const room = this.rooms.get(roomId);
    if (!room) return null;
    room.sockets.delete(socket.id);
    socket.leave(roomId);
    room.seq += 1;
    room.lastSnapshot = {
      roomId,
      seq: room.seq,
      members: Array.from(room.sockets),
      room: room.lastSnapshot.room,
    };
    this.emitToRoom(roomId, 'room_snapshot', room.lastSnapshot, session.userId);
    if (room.sockets.size === 0) {
      this.rooms.delete(roomId);
      this.logger.info('realtime_room_state_deleted', {
        service: 'RealtimeService',
        roomId,
      });
    }
    this.logger.info('realtime_leave_room', {
      service: 'RealtimeService',
      roomId,
      userId: session.userId,
      members: room.sockets.size,
    });
    return room.lastSnapshot;
  }

  heartbeat(_socket: Socket, _session: AuthSessionPayload, payload: HeartbeatPayload) {
    return {
      serverTime: Date.now(),
      lastSeq: payload.lastSeq ?? null,
    };
  }

  handleCommand(socket: Socket, session: AuthSessionPayload, payload: CommandPayload): RoomSnapshot | null {
    const { roomId, clientCommandId, clientSeq } = payload;
    let room = this.rooms.get(roomId);
    if (!room) {
      room = {
        seq: 0,
        sockets: new Set(),
        lastSnapshot: { roomId, seq: 0, members: [], room: undefined },
        processedCommands: new Set(),
      };
      this.rooms.set(roomId, room);
    }

    const correlationId = (socket as Socket & { correlationId?: string }).correlationId ?? clientCommandId;
    const commandKey = `${session.userId}:${clientCommandId}`;
    if (room.processedCommands.has(commandKey)) {
      this.logger.warn('duplicate_command', {
        service: 'RealtimeService',
        roomId,
        userId: session.userId,
        requestId: clientCommandId,
        correlationId,
      });
      return room.lastSnapshot;
    }

    if (typeof clientSeq === 'number') {
      if (clientSeq < room.seq) {
        this.logger.warn('out_of_order_message', {
          service: 'RealtimeService',
          roomId,
          userId: session.userId,
          requestId: clientCommandId,
          correlationId,
          clientSeq,
          serverSeq: room.seq,
        });
        return room.lastSnapshot;
      }
      if (clientSeq > room.seq) {
        this.logger.warn('reconnect_mismatch', {
          service: 'RealtimeService',
          roomId,
          userId: session.userId,
          requestId: clientCommandId,
          correlationId,
          clientSeq,
          serverSeq: room.seq,
        });
        return room.lastSnapshot;
      }
    }

    room.processedCommands.add(commandKey);
    room.seq += 1;
    room.lastSnapshot = {
      roomId,
      seq: room.seq,
      members: Array.from(room.sockets),
      room: room.lastSnapshot.room,
    };
    this.emitToRoom(roomId, 'room_event', { roomId, seq: room.seq, data: payload.data }, session.userId);
    this.logger.info('room_command_processed', {
      service: 'RealtimeService',
      roomId,
      userId: session.userId,
      requestId: clientCommandId,
      correlationId,
      seq: room.seq,
    });
    return room.lastSnapshot;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private emitToRoom(roomId: string, event: string, payload: unknown, _originUserId: string) {
    if (!this.io) return;
    this.io.to(roomId).emit(event, payload);
  }

  getRoomState(roomId: string): RoomSnapshot | null {
    const room = this.rooms.get(roomId);
    return room ? room.lastSnapshot : null;
  }

  broadcastRoomSnapshot(roomId: string, room: unknown) {
    let state = this.rooms.get(roomId);
    if (!state) {
      state = {
        seq: 0,
        sockets: new Set(),
        lastSnapshot: { roomId, seq: 0, members: [], room },
        processedCommands: new Set(),
      };
      this.rooms.set(roomId, state);
    }
    state.seq += 1;
    state.lastSnapshot = {
      roomId,
      seq: state.seq,
      members: Array.from(state.sockets),
      room,
    };
    this.emitToRoom(roomId, 'room_snapshot', state.lastSnapshot, 'system');
  }
}

