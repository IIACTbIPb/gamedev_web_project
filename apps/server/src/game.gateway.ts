import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import type { CharacterClass, GameState } from '@game/shared';

// Настраиваем CORS, чтобы Vite (порт 5173) мог подключиться к NestJS (порт 3001)
@WebSocketGateway({ cors: { origin: '*' } })
export class GameGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  // Игровой стейт в памяти сервера
  private players: GameState = {};

  handleConnection(client: Socket) {
    console.log(`Игрок подключился: ${client.id}`);
  }



  handleDisconnect(client: Socket) {
    console.log(`Игрок отключился: ${client.id}`);
    if (this.players[client.id]) {
      delete this.players[client.id];
      this.server.emit('gameState', this.players);
    }
  }

  @SubscribeMessage('joinGame')
  handleJoinGame(client: Socket, classType: CharacterClass) {
    console.log(`Игрок ${client.id} выбрал класс: ${classType}`);
    
    this.players[client.id] = {
      id: client.id,
      position: {
        x: (Math.random() - 0.5) * 5,
        y: 2,
        z: (Math.random() - 0.5) * 5,
      },
      classType: classType
    };

    this.server.emit('gameState', this.players);
  }

  @SubscribeMessage('move')
  handleMove(
    client: Socket, 
    data: { 
      position: { x: number; y: number; z: number }; 
      rotation: number[]; 
      animation: string;
      isAiming?: boolean;
    }
  ) {
    if (this.players[client.id]) {
      this.players[client.id].position = data.position;
      client.broadcast.emit('playerMoved', { id: client.id, ...data });
    }
  }

  @SubscribeMessage('shoot')
  handleShoot(client: Socket, arrowData: any) {
    // Просто пересылаем данные стрелы всем остальным игрокам
    client.broadcast.emit('playerShot', arrowData);
  }

  @SubscribeMessage('arrowHit')
  handleArrowHit(client: Socket, data: any) {
    // Просто пересылаем точные координаты застрявшей стрелы всем остальным
    client.broadcast.emit('arrowHit', data);
  }
}
