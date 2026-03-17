import { Vector3, Camera, Vector2, Raycaster } from 'three';
import { ECS } from './ecs'; // <-- Обновили импорт
import { socket } from './socket';
import type { Entity } from './ecs';
import type {
  AnimSettings,
  BaseAnimation,
  RangerAnimation,
  RogueAnimation,
  WarriorAnimation,
} from '@game/shared';

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
  onSkill1?: (player: Entity) => void;
}

export const CLASSES_CONFIG: {
  Warrior: ClassConfig<WarriorAnimation>;
  Ranger: ClassConfig<RangerAnimation>;
  Rogue: ClassConfig<RogueAnimation>;
} = {
  Warrior: {
    animations: {
      ...BASE_ANIMATIONS,
      Sword_Attack: { loop: false, speed: 1, fade: 0.05 },
    },
    onPrimaryAttackStart: (player) => {
      player.currentAnimation = 'Sword_Attack';
      player.actionTimer = 0.6; // Блокируем новые атаки на 0.6 сек

      // Делаем задержку в 300мс, чтобы урон прошел на середине взмаха меча!
      setTimeout(() => {
        // Если за эти 300мс мы сами успели умереть, или отключились - отменяем удар
        if (!player.rigidBody || !player.threeObject || (player.hp !== undefined && player.hp <= 0))
          return;

        const playerPos = player.rigidBody.translation();
        const playerRot = player.threeObject.quaternion;

        // 1. Вычисляем вектор взгляда воина (куда он смотрит)
        const forward = new Vector3(0, 0, 1).applyQuaternion(playerRot).normalize();
        const playerVec = new Vector3(playerPos.x, playerPos.y, playerPos.z);

        // 2. Ищем всех живых врагов в ECS
        const enemies = ECS.world
          .with('rigidBody', 'id', 'hp')
          .where((e) => e.id !== player.id && e.hp > 0);

        for (const enemy of enemies) {
          const enemyPos = enemy.rigidBody.translation();
          const enemyVec = new Vector3(enemyPos.x, enemyPos.y, enemyPos.z);

          // 3. Проверяем ДИСТАНЦИЮ (радиус поражения мечом = 3 метра)
          const distance = playerVec.distanceTo(enemyVec);

          if (distance < 3.0) {
            // 4. Проверяем УГОЛ (чтобы не бить врагов за спиной)
            const dirToEnemy = new Vector3().subVectors(enemyVec, playerVec).normalize();

            // angleTo возвращает радианы. Math.PI / 3 = 60 градусов (конус 120 градусов перед игроком)
            const angle = forward.angleTo(dirToEnemy);

            if (angle < Math.PI / 3) {
              // 🎯 ПОПАДАНИЕ! Отправляем урон на сервер
              socket.emit('meleeHit', {
                targetId: enemy.id,
                damage: 35, // Меч бьет больнее стрелы (35 против 25)
                shooterId: player.id, // Для экрана смерти
              });

              // Если хочешь "сплэш-урон" (удар по всем врагам перед собой), оставляй так.
              // Если хочешь бить только ОДНОГО врага за раз, раскомментируй break ниже:
              // break;
            }
          }
        }
      }, 300); // 300 мс задержка
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

        ECS.world.add(arrowData); // <-- Используем ECS.world
        socket.emit('shoot', arrowData);
      }
    },
  },
  Rogue: {
    animations: {
      ...BASE_ANIMATIONS,
      Dagger_Attack: { loop: false, speed: 1.5, fade: 0.05 },
      Dagger_Attack2: { loop: false, speed: 1, fade: 0.05 },
    },

    onPrimaryAttackStart: (player) => {
      player.currentAnimation = 'Dagger_Attack';
      // === ДЕЛАЕМ АТАКУ БЫСТРОЙ ===
      player.actionTimer = 0.4; // Блокируем новые атаки всего на 0.35 сек

      setTimeout(() => {
        if (!player.rigidBody || !player.threeObject || (player.hp !== undefined && player.hp <= 0))
          return;

        const playerPos = player.rigidBody.translation();
        const playerRot = player.threeObject.quaternion;
        const forward = new Vector3(0, 0, 1).applyQuaternion(playerRot).normalize();
        const playerVec = new Vector3(playerPos.x, playerPos.y, playerPos.z);

        const enemies = ECS.world
          .with('rigidBody', 'id', 'hp')
          .where((e) => e.id !== player.id && e.hp > 0);

        for (const enemy of enemies) {
          const enemyPos = enemy.rigidBody.translation();
          const enemyVec = new Vector3(enemyPos.x, enemyPos.y, enemyPos.z);
          const distance = playerVec.distanceTo(enemyVec);

          // У кинжала радиус поражения чуть меньше, чем у меча (2.5 метра)
          if (distance < 2.5) {
            const dirToEnemy = new Vector3().subVectors(enemyVec, playerVec).normalize();
            const angle = forward.angleTo(dirToEnemy);

            if (angle < Math.PI / 3) {
              socket.emit('meleeHit', {
                targetId: enemy.id,
                damage: 15, // Урон меньше
                shooterId: player.id,
              });
            }
          }
        }
      }, 150); // Задержка всего 150мс (очень быстрый удар)
    },
    onSkill1: (player) => {
      player.currentAnimation = 'Dagger_Attack2';
      player.actionTimer = 0.8; // Этот удар долгий и мощный

      setTimeout(() => {
        if (!player.rigidBody || !player.threeObject || (player.hp !== undefined && player.hp <= 0))
          return;

        const playerPos = player.rigidBody.translation();
        const playerRot = player.threeObject.quaternion;
        const forward = new Vector3(0, 0, 1).applyQuaternion(playerRot).normalize();
        const playerVec = new Vector3(playerPos.x, playerPos.y, playerPos.z);

        const enemies = ECS.world
          .with('rigidBody', 'id', 'hp')
          .where((e) => e.id !== player.id && e.hp > 0);

        for (const enemy of enemies) {
          const enemyPos = enemy.rigidBody.translation();
          const enemyVec = new Vector3(enemyPos.x, enemyPos.y, enemyPos.z);
          const distance = playerVec.distanceTo(enemyVec);

          // Суперудар бьет чуть дальше (3 метра)
          if (distance < 3.0) {
            const dirToEnemy = new Vector3().subVectors(enemyVec, playerVec).normalize();
            const angle = forward.angleTo(dirToEnemy);

            // Конус поражения меньше (бьет точечно перед собой)
            if (angle < Math.PI / 4) {
              socket.emit('meleeHit', {
                targetId: enemy.id,
                damage: 55, // Огромный урон!
                shooterId: player.id,
              });
            }
          }
        }
      }, 350); // Задержка удара
    },
  },
};
