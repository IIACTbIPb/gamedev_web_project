import { Raycaster, Vector2, Vector3 } from 'three';
import type { RangerAnimation } from '@game/shared';
import { type ClassConfig } from '@/classesConfig';
import { ECS } from '@/ecs';
import { socket } from '@/socket';
import { BASE_ANIMATIONS } from '@/baseAnimations';

// === ГЛОБАЛЬНЫЕ ВРЕМЕННЫЕ ВЕКТОРЫ И ИНСТРУМЕНТЫ ===
// Один Raycaster на всю игру!
const globalRaycaster = new Raycaster();
const centerScreen = new Vector2(0, 0);
const tempTargetPoint = new Vector3();
const tempStartPos = new Vector3();
const tempDirection = new Vector3();
const tempCameraRight = new Vector3();
const tempFlatDirection = new Vector3();
const localX = new Vector3(1, 0, 0);
const localY = new Vector3(0, 1, 0);

export const rangerConfig: ClassConfig<RangerAnimation> = {
  animations: {
    ...BASE_ANIMATIONS,
    Bow_Draw: { loop: false, speed: 1.5, fade: 0.1 },
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
    player.actionTimer = 999;

    window.dispatchEvent(new Event('aimStart'));
  },
  onPrimaryAttackRelease: (player, camera) => {
    if (!player.isAiming) return;

    player.isAiming = false;
    player.currentAnimation = 'Bow_Shoot';
    player.actionTimer = 0.5;
    window.dispatchEvent(new Event('aimEnd'));

    if (player.rigidBody && player.threeObject) {
      const playerPos = player.rigidBody.translation();

      // === ИСПОЛЬЗУЕМ ГЛОБАЛЬНЫЙ RAYCASTER ===
      globalRaycaster.setFromCamera(centerScreen, camera);
      globalRaycaster.ray.at(25, tempTargetPoint);

      tempStartPos.set(playerPos.x, playerPos.y + 1.5, playerPos.z);

      // Истинное 3D-направление выстрела
      tempDirection.subVectors(tempTargetPoint, tempStartPos).normalize();

      // Поворачиваем модельку
      const targetAngle = Math.atan2(tempDirection.x, tempDirection.z);
      player.threeObject.quaternion.setFromAxisAngle(localY, targetAngle);

      // 2. Получаем вектор "вправо" от камеры
      tempCameraRight.copy(localX).applyQuaternion(camera.quaternion);
      tempCameraRight.y = 0;
      tempCameraRight.normalize();

      tempFlatDirection.set(tempDirection.x, 0, tempDirection.z);
      if (tempFlatDirection.lengthSq() > 0.001) {
        tempFlatDirection.normalize();
      } else {
        tempFlatDirection.set(0, 0, 1);
      }

      const spawnDistance = 1.5;

      // 3. СМЕЩАЕМ СПАВН ПРАВЕЕ
      const spawnPos = {
        x: playerPos.x + tempFlatDirection.x * spawnDistance + tempCameraRight.x * 0.5,
        y: playerPos.y + 1.4,
        z: playerPos.z + tempFlatDirection.z * spawnDistance + tempCameraRight.z * 0.5,
      };

      const arrowSpeed = 45;
      const arrowData = {
        id: Math.random().toString(36).substring(2, 9),
        ownerId: player.id,
        isProjectile: true,
        position: spawnPos,
        velocity: {
          x: tempDirection.x * arrowSpeed,
          y: tempDirection.y * arrowSpeed,
          z: tempDirection.z * arrowSpeed,
        },
        lifeTime: 8,
      };

      ECS.world.add(arrowData);
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
          // Это простой JS-объект, Rapier принимает его напрямую, new Vector3() тут не нужен!
          const upwardImpulse = { x: 0, y: 8, z: 0 };
          player.rigidBody.applyImpulse(upwardImpulse, true);
        }

        player.speedBuffTimer = 10;
        player.speed = 13;
      }
    }
  ]
}