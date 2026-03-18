import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import type {
  CharacterClass,
  ClientToServerEvents,
  GameState,
  ServerToClientEvents,
  MovePayload,
  ProjectilePayload,
  ArrowHitPayload,
  MeleeHitPayload,
  EffectPayload,
  JoinGamePayload
} from '@game/shared';

// Создаем удобный алиас для строго типизированного сокета клиента
type TypedSocket = Socket<ClientToServerEvents, ServerToClientEvents>;

// Настраиваем CORS, чтобы Vite (порт 5173) мог подключиться к NestJS (порт 3001)
@WebSocketGateway({ cors: { origin: '*' } })
export class GameGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server<ClientToServerEvents, ServerToClientEvents>;

  // Игровой стейт в памяти сервера
  private players: GameState = {};

  handleConnection(client: TypedSocket) {
    console.log(`Игрок подключился: ${client.id}`);
  }

  handleDisconnect(client: TypedSocket) {
    console.log(`Игрок отключился: ${client.id}`);
    if (this.players[client.id]) {
      delete this.players[client.id];
      this.server.emit('gameState', this.players);
    }
  }

  @SubscribeMessage('joinGame')
  handleJoinGame(client: TypedSocket, data: JoinGamePayload) {
    console.log(`Игрок ${client.id} выбрал класс: ${data.classType} и никнейм: ${data.name}`);

    this.players[client.id] = {
      id: client.id,
      position: {
        x: (Math.random() - 0.5) * 5,
        y: 2,
        z: (Math.random() - 0.5) * 5,
      },
      classType: data.classType,
      hp: 100,
      maxHp: 100,
      name: data.name
    };

    this.server.emit('gameState', this.players);
  }

  @SubscribeMessage('move')
  handleMove(client: TypedSocket, data: MovePayload) {
    if (this.players[client.id]) {
      this.players[client.id].position = data.position;
      client.broadcast.emit('playerMoved', { id: client.id, ...data });
    }
  }

  @SubscribeMessage('shoot')
  handleShoot(client: TypedSocket, arrowData: ProjectilePayload) {
    client.broadcast.emit('playerShot', arrowData);
  }

  @SubscribeMessage('spawnEffect')
  handleSpawnEffect(client: TypedSocket, effectData: EffectPayload) {
    client.broadcast.emit('effectSpawned', effectData);
  }

  @SubscribeMessage('arrowHit')
  handleArrowHit(client: TypedSocket, data: ArrowHitPayload) {
    client.broadcast.emit('arrowHit', data);

    if (data.targetId && this.players[data.targetId]) {
      const target = this.players[data.targetId];

      if (target.hp <= 0) return;

      target.hp -= (data.damage || 25);

      if (target.hp <= 0) {
        target.hp = 0;

        this.server.emit('playerDied', {
          victimId: target.id,
          killerId: data.shooterId || null
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
  handleRespawn(client: TypedSocket) {
    const player = this.players[client.id];
    if (player) {
      player.hp = player.maxHp;
      player.position = { x: (Math.random() - 0.5) * 10, y: 2, z: (Math.random() - 0.5) * 10 };

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
  handleMeleeHit(client: TypedSocket, data: MeleeHitPayload) {
    if (data.targetId && this.players[data.targetId]) {
      const target = this.players[data.targetId];

      if (target.hp <= 0) return;

      target.hp -= data.damage;

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
