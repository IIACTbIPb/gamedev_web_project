import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { GameState } from '@game/shared';

// Настраиваем CORS, чтобы Vite (порт 5173) мог подключиться к NestJS (порт 3001)
@WebSocketGateway({ cors: { origin: '*' } })
export class GameGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  // Игровой стейт в памяти сервера
  private players: GameState = {};

  handleConnection(client: Socket) {
    console.log(`Игрок подключился: ${client.id}`);

    // Создаем нового игрока со случайной позицией (чтобы кубики не спавнились в одной точке)
    this.players[client.id] = {
      id: client.id,
      position: {
        x: (Math.random() - 0.5) * 5,
        y: 0,
        z: (Math.random() - 0.5) * 5,
      },
    };

    // Рассылаем обновленный стейт всем подключенным клиентам
    this.server.emit('gameState', this.players);
  }

  handleDisconnect(client: Socket) {
    console.log(`Игрок отключился: ${client.id}`);

    // Удаляем игрока и обновляем стейт у остальных
    delete this.players[client.id];
    this.server.emit('gameState', this.players);
  }

  @SubscribeMessage('move')
  handleMove(
    client: Socket, 
    data: { position: { x: number; y: number; z: number }; rotation: number[]; animation: string }
  ) {
    if (this.players[client.id]) {
      this.players[client.id].position = data.position;
      client.broadcast.emit('playerMoved', { id: client.id, ...data });
    }
  }
}
