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
      classType: classType,
      hp: 100,
      maxHp: 100
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
  handleArrowHit(client: Socket, data: { arrowId: string, position: any, targetId?: string, damage?: number, shooterId?: string }) {
    client.broadcast.emit('arrowHit', data);

    if (data.targetId && this.players[data.targetId]) {
      const target = this.players[data.targetId];
      
      // Если игрок уже мертв — игнорируем урон
      if (target.hp <= 0) return;

      target.hp -= (data.damage || 25); 

      if (target.hp <= 0) {
        target.hp = 0;
        
        // Отправляем всем событие смерти
        this.server.emit('playerDied', {
          victimId: target.id,
          killerId: data.shooterId
        });
      }

      this.server.emit('playerHpChanged', {
        id: target.id,
        hp: target.hp,
        maxHp: target.maxHp
      });
    }
  }

  @SubscribeMessage('respawn')
  handleRespawn(client: Socket) {
    const player = this.players[client.id];
    if (player) {
      // 1. Восстанавливаем ХП
      player.hp = player.maxHp;
      // 2. Кидаем в случайную точку
      player.position = { x: (Math.random() - 0.5) * 10, y: 2, z: (Math.random() - 0.5) * 10 };
      
      // Обновляем общий стейт
      this.server.emit('gameState', this.players);
      
      this.server.emit('playerHpChanged', {
        id: player.id,
        hp: player.hp,
        maxHp: player.maxHp
      });

      this.server.emit('playerRespawned', {
        id: player.id,
        position: player.position
      });
    }
  }

  @SubscribeMessage('meleeHit')
  handleMeleeHit(client: Socket, data: { targetId: string, damage: number, shooterId: string }) {
    if (data.targetId && this.players[data.targetId]) {
      const target = this.players[data.targetId];
      
      // Если враг уже мертв — игнорируем
      if (target.hp <= 0) return;

      target.hp -= data.damage;

      // Логика смерти (такая же, как у стрел)
      if (target.hp <= 0) {
        target.hp = 0;
        this.server.emit('playerDied', {
          victimId: target.id,
          killerId: data.shooterId
        });
      }

      this.server.emit('playerHpChanged', {
        id: target.id,
        hp: target.hp,
        maxHp: target.maxHp
      });
    }
  }
}
