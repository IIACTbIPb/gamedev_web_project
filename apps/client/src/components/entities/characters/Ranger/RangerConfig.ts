import { Raycaster, Vector2, Vector3 } from 'three';
import type { RangerAnimation } from '@game/shared';
import { BASE_ANIMATIONS, type ClassConfig } from '@/classesConfig';
import { ECS } from '@/ecs';
import { socket } from '@/socket';

export const rangerConfig: ClassConfig<RangerAnimation> = {
  animations: {
    ...BASE_ANIMATIONS,
    Bow_Draw: { loop: false, speed: 1.5, fade: 0.1 }, // Анимация натяжения (остановится в конце)
    Bow_Shoot: { loop: false, speed: 2, fade: 0.05 },
  },
  locomotion: {
    idle: 'Idle',
    run: 'Run_Holding',
    airborne: 'Roll'
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

      ECS.world.add(arrowData); // <-- Используем ECS.world
      socket.emit('shoot', arrowData);
    }
  },
  skills: [
    {
      id: 'skill1',
      name: 'Sprint',
      icon: '💨',
      cooldown: 15,
      onUse: (player) => {
        player.currentAnimation = 'Idle_Attacking'
        player.actionTimer = 0.5;

        // === МАГИЯ ФИЗИКИ: ПОДБРАСЫВАЕМ ВВЕРХ ===
        if (player.rigidBody) {
          // Сила импульса (8 — это примерное значение, как у прыжка.
          // Попробуй значения от 5 до 12, чтобы найти идеальный баланс)
          const upwardImpulse = { x: 0, y: 8, z: 0 };

          // Применяем импульс. Второй аргумент true — "wake up" тела, если оно спало.
          player.rigidBody.applyImpulse(upwardImpulse, true);
        }
        // ===========================================

        player.speedBuffTimer = 10;
        player.speed = 13;
        // Опционально: можно запустить легкую анимацию Roll или просто оставить бег
        // При желании здесь же можно заспавнить эффект пыли из-под ног!
      }
    }
  ]
}