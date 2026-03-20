import { Vector3 } from 'three';
import type { WarriorAnimation } from '@game/shared';
import { BASE_ANIMATIONS, type ClassConfig } from '@/classesConfig';
import { ECS } from '@/ecs';
import { socket } from '@/socket';

export const warriorConfig: ClassConfig<WarriorAnimation> = {
  animations: {
    ...BASE_ANIMATIONS,
    Sword_Attack: { loop: false, speed: 1, fade: 0.05 },
    Sword_Attack2: { loop: false, speed: 0.9, fade: 0.05 },
  },
  locomotion: {
    idle: 'Idle',
    run: 'Run_Weapon',
    airborne: 'Roll'
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
  skills: [
    {
      id: 'skill1',
      name: 'Heavy Cleave',
      icon: '⚔️', // Эмодзи-заглушка, заменишь потом в SkillBar
      cooldown: 2, // 8 секунд перезарядки
      onUse: (player) => {
        player.currentAnimation = 'Sword_Attack2';
        player.actionTimer = 1.0; // Игрок замирает на 1 секунду!

        // Удар происходит чуть позже (на 400мс), так как замах тяжелый
        setTimeout(() => {
          if (!player.rigidBody || !player.threeObject || (player.hp !== undefined && player.hp <= 0))
            return;

          const playerPos = player.rigidBody.translation();
          const playerRot = player.threeObject.quaternion;
          const forward = new Vector3(0, 0, 1).applyQuaternion(playerRot).normalize();
          const playerVec = new Vector3(playerPos.x, playerPos.y, playerPos.z);

          const effectData = {
            id: Math.random().toString(36).substring(2, 9),
            isEffect: true,
            effectType: 'WarriorCleave',
            // Спавним чуть впереди игрока и на уровне груди
            position: { x: playerPos.x, y: playerPos.y + 1.2, z: playerPos.z },
            // Передаем вращение игрока, чтобы волна полетела туда, куда он смотрит
            rotation: { x: playerRot.x, y: playerRot.y, z: playerRot.z, w: playerRot.w },
          };
          ECS.world.add(effectData); // Себе
          socket.emit('spawnEffect', effectData); // Другим

          const enemies = ECS.world
            .with('rigidBody', 'id', 'hp')
            .where((e) => e.id !== player.id && e.hp > 0);

          for (const enemy of enemies) {
            const enemyPos = enemy.rigidBody.translation();
            const enemyVec = new Vector3(enemyPos.x, enemyPos.y, enemyPos.z);

            const distance = playerVec.distanceTo(enemyVec);

            if (distance < 5) {
              const dirToEnemy = new Vector3().subVectors(enemyVec, playerVec).normalize();
              const angle = forward.angleTo(dirToEnemy);

              // Широкий размах! Угол Math.PI / 2 означает 180 градусов перед воином
              // Он заденет всех врагов, стоящих спереди и по бокам
              if (angle < Math.PI / 2) {
                socket.emit('meleeHit', {
                  targetId: enemy.id,
                  damage: 60, // Сносит больше половины ХП за раз
                  shooterId: player.id,
                });
              }
            }
          }
        }, 400);
      }
    }
  ]
}