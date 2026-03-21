import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import {
  type CharacterClass,
  type ClientToServerEvents,
  type GameState,
  type ServerToClientEvents,
  type MovePayload,
  type ProjectilePayload,
  type ArrowHitPayload,
  type MeleeHitPayload,
  type EffectPayload,
  type JoinGamePayload,
  CLASS_BALANCE
} from '@game/shared';

type TypedSocket = Socket<ClientToServerEvents, ServerToClientEvents>;

@WebSocketGateway({ cors: { origin: '*' } })
export class GameGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server<ClientToServerEvents, ServerToClientEvents>;

  private players: GameState = {};

  // === ВСПОМОГАТЕЛЬНЫЙ МЕТОД ДЛЯ ХП ===
  private getClassMaxHp(classType: CharacterClass): number {
    switch (classType) {
      case 'Warrior': return 150;
      case 'Rogue': return 120;
      case 'Ranger': return 100;
      default: return 100;
    }
  }

  // === УНИВЕРСАЛЬНЫЙ МЕТОД ПОЛУЧЕНИЯ УРОНА ===
  private applyDamage(targetId: string, damage: number, attackerId?: string) {
    const target = this.players[targetId];
    if (!target || target.hp <= 0) return;

    const validDamage = Math.min(damage, 100);

    target.hp -= validDamage;

    if (target.hp <= 0) {
      target.hp = 0;
      this.server.emit('playerDied', {
        victimId: target.id,
        // Если attackerId нет, передаем undefined (или null, если так указано в твоих типах ServerToClientEvents)
        killerId: attackerId
      });
    }

    this.server.emit('playerHpChanged', {
      id: target.id,
      hp: target.hp,
      maxHp: target.maxHp
    });
  }

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
    console.log(`Игрок ${client.id} выбрал класс: ${data.classType} и ник: ${data.name}`);

    const maxHp = this.getClassMaxHp(data.classType);

    this.players[client.id] = {
      id: client.id,
      position: {
        x: (Math.random() - 0.5) * 5,
        y: 2,
        z: (Math.random() - 0.5) * 5,
      },
      classType: data.classType,
      hp: maxHp,
      maxHp: maxHp,
      name: data.name
    };

    this.server.emit('gameState', this.players);
  }

  @SubscribeMessage('move')
  handleMove(client: TypedSocket, data: MovePayload) {
    const player = this.players[client.id];
    // Мертвые не двигаются!
    if (player && player.hp > 0) {
      player.position = data.position;
      client.broadcast.emit('playerMoved', { id: client.id, ...data });
    }
  }

  @SubscribeMessage('shoot')
  handleShoot(client: TypedSocket, arrowData: ProjectilePayload) {
    const player = this.players[client.id];
    // Мертвые не стреляют!
    if (player && player.hp > 0) {
      client.broadcast.emit('playerShot', arrowData);
    }
  }

  @SubscribeMessage('spawnEffect')
  handleSpawnEffect(client: TypedSocket, effectData: EffectPayload) {
    const player = this.players[client.id];
    if (player && player.hp > 0) {
      client.broadcast.emit('effectSpawned', effectData);
    }
  }

  @SubscribeMessage('arrowHit')
  handleArrowHit(client: TypedSocket, data: ArrowHitPayload) {
    // Останавливаем стрелу визуально для всех
    client.broadcast.emit('arrowHit', data);

    const attacker = data.shooterId ? this.players[data.shooterId] : undefined;
    if (data.targetId && attacker) {
      let damage = CLASS_BALANCE[attacker.classType].primaryDamage;
      if (data.attackType === 'skill1') damage = CLASS_BALANCE[attacker.classType].skill1.damage;
      if (data.attackType === 'skill2') damage = CLASS_BALANCE[attacker.classType].skill2.damage;

      this.applyDamage(data.targetId, damage, data.shooterId);
    }
  }

  @SubscribeMessage('meleeHit')
  handleMeleeHit(client: TypedSocket, data: MeleeHitPayload) {
    const attacker = this.players[client.id];

    // Проверка 1: Атакующий существует и жив
    if (!attacker || attacker.hp <= 0) return;
    let damage = CLASS_BALANCE[attacker.classType].primaryDamage;
    if (data.attackType === 'skill1') damage = CLASS_BALANCE[attacker.classType].skill1.damage;
    if (data.attackType === 'skill2') damage = CLASS_BALANCE[attacker.classType].skill2.damage;

    this.applyDamage(data.targetId, damage, client.id);
  }

  @SubscribeMessage('respawn')
  handleRespawn(client: TypedSocket) {
    const player = this.players[client.id];
    if (player) {
      player.hp = player.maxHp;
      player.position = { x: (Math.random() - 0.5) * 10, y: 2, z: (Math.random() - 0.5) * 10 };

      // Сообщаем всем новые координаты и ХП
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
}