import { useFrame } from '@react-three/fiber';
import { Vector3 } from 'three';
import { useRapier } from '@react-three/rapier';
import { ECS } from '@/ecs';
import { socket } from '@/socket';

const projectiles = ECS.world.with('isProjectile', 'position', 'velocity', 'lifeTime', 'ownerId');
const players = ECS.world.with('rigidBody', 'id');

const GRAVITY = 10;

// Временные вектора, чтобы не создавать их каждый кадр (оптимизация)
const oldPos = new Vector3();
const moveVector = new Vector3();
const rayDir = new Vector3();

export const ProjectileSystem = () => {
  const { rapier, world } = useRapier(); // Подключаем физический движок

  useFrame((_, delta) => {
    for (const entity of projectiles) {
      entity.lifeTime -= delta;

      if (entity.lifeTime <= 0) {
        ECS.world.remove(entity);
        continue;
      }

      // Если стрела уже остановилась (вонзилась во что-то) - просто ждем конца lifeTime
      if (entity.velocity.x === 0 && entity.velocity.y === 0 && entity.velocity.z === 0) {
        continue;
      }

      // 1. Запоминаем текущую позицию
      oldPos.set(entity.position.x, entity.position.y, entity.position.z);

      // 2. Вычисляем гравитацию и вектор движения для этого кадра
      entity.velocity.y -= GRAVITY * delta;

      moveVector.set(
        entity.velocity.x * delta,
        entity.velocity.y * delta,
        entity.velocity.z * delta
      );

      const desiredDist = moveVector.length();

      // === АВТОРИТЕТ СТРЕЛКА (Проверяем столкновения только если мы выпустили стрелу) ===
      if (entity.ownerId === socket.id && desiredDist > 0.0001) {

        // Находим RigidBody стрелка, чтобы стрела случайно не врезалась в нас самих при выстреле
        let ownerRigidBody = undefined;
        for (const player of players) {
          if (player.id === entity.ownerId) {
            ownerRigidBody = player.rigidBody;
            break;
          }
        }

        // Подготавливаем луч
        rayDir.copy(moveVector).normalize();
        const ray = new rapier.Ray(oldPos, rayDir);

        // Пускаем луч! 
        // undefined во флагах групп означает "Врезаться вообще во ВСЁ, что имеет коллайдер"
        const hit = world.castRay(
          ray,
          desiredDist,
          true,              // solid
          undefined,         // filterGroups (Врезаемся и в ENVIRONMENT, и в DECORATION, и в Игроков)
          undefined,         // filterCallback
          undefined,         // filterCollider
          ownerRigidBody     // filterExcludeRigidBody (Игнорируем самого стрелка)
        );

        if (hit && hit.timeOfImpact <= desiredDist) {
          // === МЫ ВО ЧТО-ТО ВРЕЗАЛИСЬ! ===

          // Ставим стрелу ровно в точку удара
          const hitX = oldPos.x + rayDir.x * hit.timeOfImpact;
          const hitY = oldPos.y + rayDir.y * hit.timeOfImpact;
          const hitZ = oldPos.z + rayDir.z * hit.timeOfImpact;

          entity.position.x = hitX;
          entity.position.y = hitY;
          entity.position.z = hitZ;

          // Останавливаем стрелу и оставляем торчать на 3 секунды
          entity.velocity.x = 0;
          entity.velocity.y = 0;
          entity.velocity.z = 0;
          entity.lifeTime = Math.min(entity.lifeTime, 3);

          // Проверяем, в кого именно мы попали (игрок это или стена/дерево?)
          const hitCollider = hit.collider;
          const hitRigidBody = hitCollider.parent(); // Получаем тело, к которому привязан коллайдер

          let hitPlayerId = null;

          if (hitRigidBody) {
            // Ищем, принадлежит ли это тело какому-нибудь игроку
            for (const target of players) {
              if (target.rigidBody === hitRigidBody) {
                hitPlayerId = target.id;
                break;
              }
            }
          }

          if (hitPlayerId) {
            // Попали в игрока!
            socket.emit('arrowHit', {
              arrowId: entity.id!,
              position: { x: hitX, y: hitY, z: hitZ },
              targetId: hitPlayerId,
              damage: 25,
              shooterId: entity.ownerId,
            });
          } else {
            // Попали в стену, дерево, землю или бочку
            socket.emit('arrowHit', {
              arrowId: entity.id!,
              position: { x: hitX, y: hitY, z: hitZ },
            });
          }

          continue; // Прерываем этот кадр для этой стрелы, так как она остановилась
        }
      }

      // 3. Если мы ни во что не врезались (или мы не владелец стрелы), двигаем её дальше
      entity.position.x += moveVector.x;
      entity.position.y += moveVector.y;
      entity.position.z += moveVector.z;

      // Запасная проверка на землю (на случай, если у земли вдруг нет физического коллайдера)
      if (entity.position.y <= 0) {
        entity.position.y = 0;
        entity.velocity.x = 0;
        entity.velocity.y = 0;
        entity.velocity.z = 0;

        if (entity.ownerId === socket.id) {
          socket.emit('arrowHit', {
            arrowId: entity.id!,
            position: { x: entity.position.x, y: 0, z: entity.position.z },
          });
        }
      }
    }
  });

  return null;
};