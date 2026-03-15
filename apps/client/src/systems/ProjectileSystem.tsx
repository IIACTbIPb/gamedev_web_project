import { useFrame } from '@react-three/fiber';
import { world } from '../ecs';
import { socket } from '../socket';

const projectiles = world.with('isProjectile', 'position', 'velocity', 'lifeTime', 'ownerId');
const players = world.with('rigidBody', 'id');

const GRAVITY = 10;

export const ProjectileSystem = () => {
  useFrame((_, delta) => {
    for (const entity of projectiles) {
      entity.lifeTime -= delta;

      if (entity.lifeTime <= 0) {
        world.remove(entity);
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
      // Только тот, кто выпустил стрелу, проверяет, попала ли она!
      if (entity.ownerId === socket.id) {
        let hitSomeone = false;

        for (const target of players) {
          if (target.id === entity.ownerId) continue;

          const targetPos = target.rigidBody.translation();

          const dx = entity.position.x - targetPos.x;
          const dy = entity.position.y - targetPos.y;
          const dz = entity.position.z - targetPos.z;

          // === ИСПРАВЛЕННЫЙ ХИТБОКС ===
          // Увеличили радиус чуть-чуть (0.3)
          // Расширили высоту от -0.5 (на случай если мы бьем по ногам) до 2.5 (голова)
          if (dx * dx + dz * dz < 0.3 && dy >= -0.5 && dy <= 2.5) {
            entity.velocity.x = 0;
            entity.velocity.y = 0;
            entity.velocity.z = 0;
            entity.lifeTime = Math.min(entity.lifeTime, 3);
            hitSomeone = true;

            // Сообщаем серверу, где именно застряла стрела
            socket.emit('arrowHit', {
              arrowId: entity.id,
              position: { x: entity.position.x, y: entity.position.y, z: entity.position.z },
            });

            break;
          }
        }

        if (!hitSomeone && entity.position.y <= 0) {
          entity.position.y = 0;
          entity.velocity.x = 0;
          entity.velocity.y = 0;
          entity.velocity.z = 0;

          // Также сообщаем о попадании в землю
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
