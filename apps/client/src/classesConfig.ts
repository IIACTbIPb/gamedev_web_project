import { Vector3, Camera, Vector2, Raycaster } from 'three';
import { world } from './ecs';
import { socket } from './socket';
import type { Entity } from './ecs';
import type { AnimSettings, BaseAnimation, RangerAnimation, WarriorAnimation } from './types';

const BASE_ANIMATIONS: Record<BaseAnimation, AnimSettings> = {
  Idle: { loop: true, speed: 1, fade: 0.2 },
  Run: { loop: true, speed: 1, fade: 0.2 },
  Roll: { loop: false, speed: 1.5, fade: 0.05 },
  Death: { loop: false, speed: 1, fade: 0.2 },
};

export interface ClassConfig<T extends string> {
  animations: Partial<Record<T, AnimSettings>> & Record<BaseAnimation, AnimSettings>;
  // Теперь у нас две фазы атаки:
  onPrimaryAttackStart: (player: Entity) => void;
  onPrimaryAttackRelease?: (player: Entity, camera: Camera) => void;
}

export const CLASSES_CONFIG: {
  Warrior: ClassConfig<WarriorAnimation>;
  Ranger: ClassConfig<RangerAnimation>;
} = {
  Warrior: {
    animations: {
      ...BASE_ANIMATIONS,
      Sword_Attack: { loop: false, speed: 1, fade: 0.05 },
    },
    onPrimaryAttackStart: (player) => {
      player.currentAnimation = 'Sword_Attack';
      player.actionTimer = 0.6;
    },
  },

  Ranger: {
    animations: {
      ...BASE_ANIMATIONS,
      Bow_Draw: { loop: false, speed: 1.5, fade: 0.1 }, // Анимация натяжения (остановится в конце)
      Bow_Shoot: { loop: false, speed: 2, fade: 0.05 },
    },
    onPrimaryAttackStart: (player) => {
      player.isAiming = true;
      player.currentAnimation = 'Bow_Draw';
      player.actionTimer = 999; // Блокируем движение, пока целимся!

      // Бросаем ивент для интерфейса, чтобы показать прицел
      window.dispatchEvent(new Event('aimStart'));
    },
    onPrimaryAttackRelease: (player, camera) => {
      if (!player.isAiming) return; // Защита от случайных отпусканий

      player.isAiming = false;
      player.currentAnimation = 'Bow_Shoot';
      player.actionTimer = 0.5; // Разблокируем движение через полсекунды
      window.dispatchEvent(new Event('aimEnd')); // Прячем прицел

      if (player.rigidBody && player.threeObject) {
        const playerPos = player.rigidBody.translation();

        // === ИСПРАВЛЕННЫЙ РЕЙКАСТИНГ (Идеальная точность) ===
        const raycaster = new Raycaster();
        raycaster.setFromCamera(new Vector2(0, 0), camera);

        const targetPoint = new Vector3();
        // 1. Берем точку ровно по центру крестика на расстоянии 25 метров.
        // (Убрали поиск пола, чтобы луч не ломался при прицеливании во врага)
        raycaster.ray.at(25, targetPoint);

        const startPos = new Vector3(playerPos.x, playerPos.y + 1.5, playerPos.z);

        // Истинное 3D-направление выстрела
        const direction = new Vector3().subVectors(targetPoint, startPos).normalize();

        // Поворачиваем модельку
        const targetAngle = Math.atan2(direction.x, direction.z);
        player.threeObject.quaternion.setFromAxisAngle(new Vector3(0, 1, 0), targetAngle);

        // 2. Получаем вектор "вправо" от камеры
        const cameraRight = new Vector3(1, 0, 0).applyQuaternion(camera.quaternion);
        cameraRight.y = 0;
        cameraRight.normalize();

        const flatDirection = new Vector3(direction.x, 0, direction.z);
        if (flatDirection.lengthSq() > 0.001) {
          flatDirection.normalize();
        } else {
          flatDirection.set(0, 0, 1);
        }

        const spawnDistance = 1.5;

        // 3. СМЕЩАЕМ СПАВН ПРАВЕЕ (cameraRight.x * 0.5)
        // Стрела появится ближе к линии взгляда камеры, убирая косой параллакс!
        const spawnPos = {
          x: playerPos.x + flatDirection.x * spawnDistance + cameraRight.x * 0.5,
          y: playerPos.y + 1.4,
          z: playerPos.z + flatDirection.z * spawnDistance + cameraRight.z * 0.5,
        };

        const arrowSpeed = 45;
        const arrowData = {
          id: Math.random().toString(36).substring(2, 9),
          ownerId: player.id,
          isProjectile: true,
          position: spawnPos,
          velocity: {
            x: direction.x * arrowSpeed,
            y: direction.y * arrowSpeed,
            z: direction.z * arrowSpeed,
          },
          lifeTime: 8,
        };

        world.add(arrowData);
        socket.emit('shoot', arrowData);
      }
    },
  },
};
