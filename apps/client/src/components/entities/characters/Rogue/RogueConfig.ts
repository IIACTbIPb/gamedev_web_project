import { CLASS_BALANCE, type RogueAnimation } from '@game/shared';
import { type ClassConfig } from '@/classesConfig';
import { ECS } from '@/ecs';
import { socket } from '@/socket';
import { Vector3 } from 'three';
import { BASE_ANIMATIONS } from '@/baseAnimations';

// === ГЛОБАЛЬНЫЕ ВРЕМЕННЫЕ ВЕКТОРЫ ===
const tempForward = new Vector3();
const tempPlayerVec = new Vector3();
const tempEnemyVec = new Vector3();
const tempDir = new Vector3();
const tempSpawnPos = new Vector3();
const localZ = new Vector3(0, 0, 1);

const ROGUE_STATS = CLASS_BALANCE.Rogue;

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
    player.actionTimer = 0.4;

    setTimeout(() => {
      if (!player.rigidBody || !player.threeObject || (player.hp !== undefined && player.hp <= 0))
        return;

      const playerPos = player.rigidBody.translation();
      const playerRot = player.threeObject.quaternion;

      // ИСПОЛЬЗУЕМ ГЛОБАЛЬНЫЕ ВЕКТОРЫ
      tempForward.copy(localZ).applyQuaternion(playerRot).normalize();
      tempPlayerVec.set(playerPos.x, playerPos.y, playerPos.z);

      const enemies = ECS.world
        .with('rigidBody', 'id', 'hp')
        .where((e) => e.id !== player.id && e.hp > 0);

      for (const enemy of enemies) {
        const enemyPos = enemy.rigidBody.translation();
        tempEnemyVec.set(enemyPos.x, enemyPos.y, enemyPos.z);
        const distance = tempPlayerVec.distanceTo(tempEnemyVec);

        if (distance < 2.5) {
          tempDir.subVectors(tempEnemyVec, tempPlayerVec).normalize();
          const angle = tempForward.angleTo(tempDir);

          if (angle < Math.PI / 3) {
            socket.emit('meleeHit', {
              targetId: enemy.id,
              attackType: 'primary',
              shooterId: player.id,
            });
          }
        }
      }
    }, 150);
  },
  skills: [
    {
      id: 'skill1',
      name: 'Dagger Strike',
      icon: '/rogue_skill.png',
      cooldown: ROGUE_STATS.skill1.cooldown,
      onUse: (player) => {
        player.currentAnimation = 'Dagger_Attack2';
        player.actionTimer = 0.8;

        setTimeout(() => {
          if (!player.rigidBody || !player.threeObject || (player.hp !== undefined && player.hp <= 0))
            return;

          player.isInvisible = false;
          const playerPos = player.rigidBody.translation();
          const playerRot = player.threeObject.quaternion;

          tempForward.copy(localZ).applyQuaternion(playerRot).normalize();
          tempPlayerVec.set(playerPos.x, playerPos.y, playerPos.z);

          // ИЗБАВЛЯЕМСЯ ОТ forward.clone()
          tempSpawnPos.copy(tempForward).multiplyScalar(1.5).add(tempPlayerVec);
          tempSpawnPos.y += 1;

          const effectData = {
            id: Math.random().toString(36).substring(2, 9),
            isEffect: true,
            effectType: 'DaggerHit',
            position: { x: tempSpawnPos.x, y: tempSpawnPos.y, z: tempSpawnPos.z },
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

            if (distance < 3.0) {
              tempDir.subVectors(tempEnemyVec, tempPlayerVec).normalize();
              const angle = tempForward.angleTo(tempDir);

              if (angle < Math.PI / 4) {
                socket.emit('meleeHit', {
                  targetId: enemy.id,
                  attackType: 'skill1',
                  shooterId: player.id,
                });
              }
            }
          }
        }, 350);
      }
    },
    {
      id: 'skill2',
      name: 'Invisibility',
      icon: '/rogue_skill2.png',
      cooldown: ROGUE_STATS.skill2.cooldown,
      onUse: (player) => {
        player.isInvisible = true;
        setTimeout(() => {
          if (player) {
            player.isInvisible = false;
          }
        }, ROGUE_STATS.skill2.duration * 1000);
      }
    }
  ]
}