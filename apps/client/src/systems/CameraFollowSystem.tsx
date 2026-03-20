import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Vector3, MathUtils, PerspectiveCamera } from 'three';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { useRapier } from '@react-three/rapier';
import { ECS } from '@/ecs';
import { PhysicsGroups } from '@/config/PhysicsGroups';
import { useSettingsStore } from '@/store';

// === НАСТРОЙКИ КАМЕРЫ ===
const CONFIG = {
  // Дистанция (Зум)
  minDistance: 1.5,
  maxDistance: 20.0,
  defaultDistance: 5.0, // С какой дистанции камера начинает

  // Прицеливание (Aiming)
  aimDistance: 3.0,
  aimFov: 40,
  defaultFov: 60,

  // Управление
  rotateSpeed: 2.0,

  // Скорости переходов (Lerp)
  followSpeed: 12.0, // Как быстро камера летит за персонажем
  aimTransitionSpeed: 8.0,
  fovTransitionSpeed: 10.0,
  restoreTransitionSpeed: 5.0,

  // Анти-клиппинг
  cameraMargin: 0.2, // Отступ от стены
  minClipDistance: 0.5, // Насколько близко можно прижать камеру к персонажу
};

const localPlayers = ECS.world.with('rigidBody', 'isMe').where((e) => e.isMe === true);

const targetPosition = new Vector3();
const previousTarget = new Vector3();
const targetShift = new Vector3();
const cameraRight = new Vector3();
const rayOrigin = new Vector3();
const rayDir = new Vector3();

export const CameraFollowSystem = () => {
  const wasAiming = useRef(false);
  const preAimDistance = useRef(CONFIG.defaultDistance);
  const preAimFov = useRef(CONFIG.defaultFov);
  const isRestoring = useRef(false);

  // Новая, "умная" память
  const unclippedDist = useRef(CONFIG.defaultDistance); // Храним только ИДЕАЛЬНУЮ дистанцию
  const clippedPos = useRef(new Vector3()); // Позиция, где камера была в конце прошлого кадра
  const isInitialized = useRef(false);

  const { rapier, world } = useRapier();
  const { sensitivity, aimSensitivity } = useSettingsStore.getState();

  useFrame((state, delta) => {
    const controls = state.controls as unknown as OrbitControlsImpl;
    const camera = state.camera as PerspectiveCamera;

    if (!controls || !camera) return;

    if (!isInitialized.current) {
      unclippedDist.current = camera.position.distanceTo(controls.target);
      clippedPos.current.copy(camera.position);
      isInitialized.current = true;
    }

    for (const entity of localPlayers) {
      if (!entity.isMe || !entity.rigidBody) continue;

      // 1. === ЧТЕНИЕ СКРОЛЛА МЫШИ ===
      const currentDist = camera.position.distanceTo(controls.target);
      const lastClippedDist = clippedPos.current.distanceTo(controls.target);

      if (lastClippedDist > 0.1 && Math.abs(currentDist - lastClippedDist) > 0.001) {
        const zoomScale = currentDist / lastClippedDist;
        unclippedDist.current *= zoomScale;
      }

      // Жестко ограничиваем зум, используя CONFIG
      unclippedDist.current = MathUtils.clamp(unclippedDist.current, CONFIG.minDistance, CONFIG.maxDistance);

      // 2. === ВОССТАНОВЛЕНИЕ КАМЕРЫ ===
      const currentDir = new Vector3().subVectors(camera.position, controls.target).normalize();
      camera.position.copy(controls.target).add(currentDir.multiplyScalar(unclippedDist.current));

      const playerPos = entity.rigidBody.translation();

      // Настройки контроллера из CONFIG
      controls.minDistance = CONFIG.minDistance;
      controls.maxDistance = CONFIG.maxDistance;
      controls.rotateSpeed = entity.isAiming ? aimSensitivity : sensitivity;

      const actualDist = camera.position.distanceTo(controls.target);

      // --- ЛОГИКА ПРИЦЕЛИВАНИЯ ---
      if (entity.isAiming && !wasAiming.current) {
        wasAiming.current = true;
        isRestoring.current = false;
        preAimDistance.current = actualDist;
        preAimFov.current = camera.fov;
      } else if (!entity.isAiming && wasAiming.current) {
        wasAiming.current = false;
        isRestoring.current = true;
      }

      const targetHeight = entity.isAiming ? 2 : 1.2;
      targetPosition.set(playerPos.x, playerPos.y + targetHeight, playerPos.z);

      if (entity.isAiming) {
        cameraRight.set(1, 0, 0).applyQuaternion(camera.quaternion);
        cameraRight.y = 0;
        cameraRight.normalize();
        targetPosition.add(cameraRight.multiplyScalar(1.1));
      }

      // --- ПЛАВНОЕ ДВИЖЕНИЕ ЗА ИГРОКОМ ---
      previousTarget.copy(controls.target);
      controls.target.lerp(targetPosition, delta * CONFIG.followSpeed);

      targetShift.subVectors(controls.target, previousTarget);
      camera.position.add(targetShift);

      // --- РУЧНОЙ ЗУМ ПРИ ПРИЦЕЛИВАНИИ ---
      if (entity.isAiming) {
        const newDist = MathUtils.lerp(actualDist, CONFIG.aimDistance, delta * CONFIG.aimTransitionSpeed);
        const dir = new Vector3().subVectors(camera.position, controls.target).normalize();
        camera.position.copy(controls.target).add(dir.multiplyScalar(newDist));

        camera.fov = MathUtils.lerp(camera.fov, CONFIG.aimFov, delta * CONFIG.fovTransitionSpeed);
        controls.minPolarAngle = 0.1;
        controls.maxPolarAngle = Math.PI - 0.1;

        unclippedDist.current = CONFIG.aimDistance;
      } else {
        if (isRestoring.current) {
          const newDist = MathUtils.lerp(actualDist, preAimDistance.current, delta * CONFIG.restoreTransitionSpeed);
          const dir = new Vector3().subVectors(camera.position, controls.target).normalize();
          camera.position.copy(controls.target).add(dir.multiplyScalar(newDist));

          if (Math.abs(actualDist - preAimDistance.current) < 0.05) {
            isRestoring.current = false;
          }
          unclippedDist.current = newDist;
        }

        camera.fov = MathUtils.lerp(camera.fov, preAimFov.current, delta * CONFIG.fovTransitionSpeed);
        controls.minPolarAngle = 0;
        controls.maxPolarAngle = Math.PI / 2 + 0.1;
      }

      camera.updateProjectionMatrix();

      // 3. Обновляем OrbitControls
      controls.update();

      unclippedDist.current = camera.position.distanceTo(controls.target);

      // 4. === АНТИ-КЛИППИНГ (ЗАЩИТА ОТ СТЕН) ===
      rayOrigin.copy(controls.target);
      rayDir.subVectors(camera.position, controls.target);
      const desiredDist = rayDir.length();
      rayDir.normalize();

      const ray = new rapier.Ray(rayOrigin, rayDir);
      const rayCollisionGroups = PhysicsGroups.CAMERA_RAY;

      const hit = world.castRay(
        ray,
        desiredDist,
        true,
        undefined,
        rayCollisionGroups,
        undefined,
        entity.rigidBody
      );

      if (hit && hit.timeOfImpact < desiredDist) {
        // Используем лимиты из CONFIG
        const safeDistance = Math.max(CONFIG.minClipDistance, hit.timeOfImpact - CONFIG.cameraMargin);
        camera.position.copy(rayOrigin).addScaledVector(rayDir, safeDistance);
      }

      // 5. === ЗАПОМИНАЕМ ТОЧНОЕ ПОЛОЖЕНИЕ КАМЕРЫ ===
      clippedPos.current.copy(camera.position);
    }
  });

  return null;
};