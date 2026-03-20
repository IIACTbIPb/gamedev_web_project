import type { RogueAnimation } from '@game/shared';
import { BASE_ANIMATIONS, type ClassConfig } from '@/classesConfig';
import { ECS } from '@/ecs';
import { socket } from '@/socket';
import { Vector3 } from 'three';


export const rogueConfig: ClassConfig<RogueAnimation> = {
  animations: {
    ...BASE_ANIMATIONS,
    Dagger_Attack: { loop: false, speed: 1.5, fade: 0.05 },
    Dagger_Attack2: { loop: false, speed: 1, fade: 0.05 },
  },
  locomotion: {
    idle: 'Idle',
    run: 'Run',
    airborne: 'Roll'
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
  skills: [
    {
      id: 'skill1',
      name: 'Dagger Strike',
      icon: '💥',
      cooldown: 15,
      onUse: (player) => {
        player.currentAnimation = 'Dagger_Attack2';
        player.actionTimer = 0.8; // Этот удар долгий и мощный

        setTimeout(() => {
          if (!player.rigidBody || !player.threeObject || (player.hp !== undefined && player.hp <= 0))
            return;

          player.isInvisible = false;
          const playerPos = player.rigidBody.translation();
          const playerRot = player.threeObject.quaternion;
          const forward = new Vector3(0, 0, 1).applyQuaternion(playerRot).normalize();
          const playerVec = new Vector3(playerPos.x, playerPos.y, playerPos.z);

          // Спавним эффект Даггера ПРЯМО перед персонажем
          const spawnPos = new Vector3(playerPos.x, playerPos.y + 1, playerPos.z).add(
            forward.clone().multiplyScalar(1.5),
          );

          const effectData = {
            id: Math.random().toString(36).substring(2, 9),
            isEffect: true,
            effectType: 'DaggerHit',
            position: { x: spawnPos.x, y: spawnPos.y, z: spawnPos.z },
            rotation: { x: playerRot.x, y: playerRot.y, z: playerRot.z, w: playerRot.w },
          };

          // Спавним у себя для нулевой задержки...
          ECS.world.add(effectData);
          // ...и отправляем на сервер, чтобы увидели остальные
          socket.emit('spawnEffect', effectData);


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
      }
    },
    {
      id: 'skill2',
      name: 'Invisibility',
      icon: '👻',
      cooldown: 30,
      onUse: (player) => {
        player.isInvisible = true;
        // Отключаем невидимость через 10 секунд
        setTimeout(() => {
          if (player) {
            player.isInvisible = false;
          }
        }, 10000);
      }
    }
  ]
}