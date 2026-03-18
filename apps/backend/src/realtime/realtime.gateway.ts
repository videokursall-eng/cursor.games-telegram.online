import { Logger } from '@nestjs/common';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { AuthService } from '../auth/auth.service';
import type { AuthSessionPayload } from 'shared';
import {
  CommandPayload,
  HeartbeatPayload,
  JoinRoomPayload,
  RealtimeService,
} from './realtime.service';
import { StructuredLoggerService } from '../logging/structured-logger.service';

interface AuthedSocket extends Socket {
  session?: AuthSessionPayload;
  correlationId?: string;
}

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class RealtimeGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(RealtimeGateway.name);

  constructor(
    private readonly authService: AuthService,
    private readonly realtimeService: RealtimeService,
    private readonly structuredLogger: StructuredLoggerService,
  ) {}

  handleConnection(client: AuthedSocket) {
    const token = (client.handshake.auth?.token as string | undefined) ?? (client.handshake.query.token as string | undefined);
    if (!token) {
      this.logger.warn(`Socket ${client.id} missing token, disconnecting`);
      this.structuredLogger.warn('socket_missing_token', {
        service: 'RealtimeGateway',
      });
      client.disconnect(true);
      return;
    }
    const session = this.authService.verifyToken(token);
    if (!session) {
      this.logger.warn(`Socket ${client.id} invalid token, disconnecting`);
      this.structuredLogger.warn('socket_invalid_token', {
        service: 'RealtimeGateway',
      });
      client.disconnect(true);
      return;
    }
    client.session = session;
    const handshakeCorrelation =
      (client.handshake.auth?.correlationId as string | undefined) ??
      (client.handshake.headers['x-correlation-id'] as string | undefined);
    client.correlationId = handshakeCorrelation && handshakeCorrelation.length > 0 ? handshakeCorrelation : client.id;
    this.realtimeService.setServer(this.server);
    this.realtimeService.onClientConnected(client, session);
    this.logger.debug(`Socket ${client.id} connected as user ${session.userId}`);
    this.structuredLogger.info('socket_connected', {
      service: 'RealtimeGateway',
      userId: session.userId,
      correlationId: client.correlationId,
    });
  }

  handleDisconnect(client: AuthedSocket) {
    this.realtimeService.onClientDisconnected(client);
    this.logger.debug(`Socket ${client.id} disconnected`);
    this.structuredLogger.info('socket_disconnected', {
      service: 'RealtimeGateway',
      userId: client.session?.userId,
      correlationId: client.correlationId,
    });
  }

  @SubscribeMessage('join_room')
  handleJoinRoom(
    @ConnectedSocket() client: AuthedSocket,
    @MessageBody() payload: JoinRoomPayload,
  ) {
    if (!client.session) {
      client.disconnect(true);
      return;
    }
    return this.realtimeService.joinRoom(client, client.session, payload);
  }

  @SubscribeMessage('leave_room')
  handleLeaveRoom(
    @ConnectedSocket() client: AuthedSocket,
    @MessageBody() payload: JoinRoomPayload,
  ) {
    if (!client.session) {
      client.disconnect(true);
      return;
    }
    return this.realtimeService.leaveRoom(client, client.session, payload);
  }

  @SubscribeMessage('heartbeat')
  handleHeartbeat(
    @ConnectedSocket() client: AuthedSocket,
    @MessageBody() payload: HeartbeatPayload,
  ) {
    if (!client.session) {
      client.disconnect(true);
      return;
    }
    return this.realtimeService.heartbeat(client, client.session, payload);
  }

  @SubscribeMessage('command')
  handleCommand(
    @ConnectedSocket() client: AuthedSocket,
    @MessageBody() payload: CommandPayload,
  ) {
    if (!client.session) {
      client.disconnect(true);
      return;
    }
    return this.realtimeService.handleCommand(client, client.session, payload);
  }
}

