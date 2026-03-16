import { useFrame } from '@react-three/fiber';
import { ECS } from '../ecs';
import { socket } from '../socket';

const projectiles = ECS.world.with('isProjectile', 'position', 'velocity', 'lifeTime', 'ownerId');
const players = ECS.world.with('rigidBody', 'id');

const GRAVITY = 10;

export const ProjectileSystem = () => {
  useFrame((_, delta) => {
    for (const entity of projectiles) {
      entity.lifeTime -= delta;

      if (entity.lifeTime <= 0) {
        ECS.world.remove(entity);
        continue;
      }

      if (entity.velocity.x === 0 && entity.velocity.y === 0 && entity.velocity.z === 0) {
        continue;
      }

      entity.velocity.y -= GRAVITY * delta;
      entity.position.x += entity.velocity.x * delta;
      entity.position.y += entity.velocity.y * delta;
      entity.position.z += entity.velocity.z * delta;

      // === АВТОРИТЕТ СТРЕЛКА ===
      if (entity.ownerId === socket.id) {
        let hitSomeone = false;

        for (const target of players) {
          if (target.id === entity.ownerId) continue;

          const targetPos = target.rigidBody.translation();

          const dx = entity.position.x - targetPos.x;
          const dy = entity.position.y - targetPos.y;
          const dz = entity.position.z - targetPos.z;

          // === ИСПРАВЛЕННЫЙ ХИТБОКС ===
          if (dx * dx + dz * dz < 0.3 && dy >= -0.5 && dy <= 2.5) {
            entity.velocity.x = 0;
            entity.velocity.y = 0;
            entity.velocity.z = 0;
            entity.lifeTime = Math.min(entity.lifeTime, 3);
            hitSomeone = true;

            // Сообщаем серверу, где именно застряла стрела и кто получил урон
            socket.emit('arrowHit', {
              arrowId: entity.id,
              position: { x: entity.position.x, y: entity.position.y, z: entity.position.z },
              targetId: target.id,
              damage: 25,
              shooterId: entity.ownerId,
            });

            break;
          }
        }

        if (!hitSomeone && entity.position.y <= 0) {
          entity.position.y = 0;
          entity.velocity.x = 0;
          entity.velocity.y = 0;
          entity.velocity.z = 0;

          // Сообщаем о попадании в землю
          socket.emit('arrowHit', {
            arrowId: entity.id,
            position: { x: entity.position.x, y: entity.position.y, z: entity.position.z },
          });
        }
      }
    }
  });

  return null;
};
