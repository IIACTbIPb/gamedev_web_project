import { Vector3 } from 'three';
import { CLASS_BALANCE, type WarriorAnimation } from '@game/shared';
import { type ClassConfig } from '@/classesConfig';
import { ECS } from '@/ecs';
import { socket } from '@/socket';
import { BASE_ANIMATIONS } from '@/baseAnimations';

// === ГЛОБАЛЬНЫЕ ВРЕМЕННЫЕ ВЕКТОРЫ ===
// Переиспользуем их для вычислений урона, чтобы не дергать сборщик мусора при ударах по толпе
const tempForward = new Vector3();
const tempPlayerVec = new Vector3();
const tempEnemyVec = new Vector3();
const tempDir = new Vector3();
const localZ = new Vector3(0, 0, 1);

const WARRIOR_STATS = CLASS_BALANCE.Warrior;

export const warriorConfig: ClassConfig<WarriorAnimation> = {
  animations: {
    ...BASE_ANIMATIONS,
    Sword_Attack: { loop: false, speed: 1, fade: 0.05 },
    Sword_Attack2: { loop: false, speed: 0.9, fade: 0.05 },
    Run_Weapon: { loop: true, speed: 1, fade: 0.2 },
  },
  locomotion: {
    idle: 'Idle',
    run: 'Run_Weapon',
    airborne: 'Roll'
  },
  onPrimaryAttackStart: (player) => {
    player.currentAnimation = 'Sword_Attack';
    player.actionTimer = 0.6;

    setTimeout(() => {
      if (!player.rigidBody || !player.threeObject || (player.hp !== undefined && player.hp <= 0))
        return;

      const playerPos = player.rigidBody.translation();
      const playerRot = player.threeObject.quaternion;

      // 1. Вычисляем вектор взгляда (без new)
      tempForward.copy(localZ).applyQuaternion(playerRot).normalize();
      tempPlayerVec.set(playerPos.x, playerPos.y, playerPos.z);

      const enemies = ECS.world
        .with('rigidBody', 'id', 'hp')
        .where((e) => e.id !== player.id && e.hp > 0);

      for (const enemy of enemies) {
        const enemyPos = enemy.rigidBody.translation();

        // 2. Вектор врага (без new)
        tempEnemyVec.set(enemyPos.x, enemyPos.y, enemyPos.z);

        const distance = tempPlayerVec.distanceTo(tempEnemyVec);

        if (distance < 3.0) {
          // 3. Вектор направления (без new)
          tempDir.subVectors(tempEnemyVec, tempPlayerVec).normalize();
          const angle = tempForward.angleTo(tempDir);

          if (angle < Math.PI / 3) {
            socket.emit('meleeHit', {
              targetId: enemy.id,
              attackType: 'primary',
              shooterId: player.id,
            });
            // break; // Раскомментируй, если нужен удар только по одной цели
          }
        }
      }
    }, 300);
  },
  skills: [
    {
      id: 'skill1',
      name: 'Heavy Cleave',
      icon: '⚔️',
      cooldown: WARRIOR_STATS.skill1.cooldown,
      onUse: (player) => {
        player.currentAnimation = 'Sword_Attack2';
        player.actionTimer = 1.0;

        setTimeout(() => {
          if (!player.rigidBody || !player.threeObject || (player.hp !== undefined && player.hp <= 0))
            return;

          const playerPos = player.rigidBody.translation();
          const playerRot = player.threeObject.quaternion;

          // Вычисления векторов для скилла
          tempForward.copy(localZ).applyQuaternion(playerRot).normalize();
          tempPlayerVec.set(playerPos.x, playerPos.y, playerPos.z);

          const effectData = {
            id: Math.random().toString(36).substring(2, 9),
            isEffect: true,
            effectType: 'WarriorCleave',
            position: { x: playerPos.x, y: playerPos.y + 1.2, z: playerPos.z },
            rotation: { x: playerRot.x, y: playerRot.y, z: playerRot.z, w: playerRot.w },
          };
          ECS.world.add(effectData);
          socket.emit('spawnEffect', effectData);

          const enemies = ECS.world
            .with('rigidBody', 'id', 'hp')
            .where((e) => e.id !== player.id && e.hp > 0);

          for (const enemy of enemies) {
            const enemyPos = enemy.rigidBody.translation();
            tempEnemyVec.set(enemyPos.x, enemyPos.y, enemyPos.z);

            const distance = tempPlayerVec.distanceTo(tempEnemyVec);

            if (distance < 5) {
              tempDir.subVectors(tempEnemyVec, tempPlayerVec).normalize();
              const angle = tempForward.angleTo(tempDir);

              if (angle < Math.PI / 2) {
                socket.emit('meleeHit', {
                  targetId: enemy.id,
                  attackType: 'skill1',
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