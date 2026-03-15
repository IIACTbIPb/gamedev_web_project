import { useRef } from 'react'; // <-- Добавили импорт useRef
import { useFrame } from '@react-three/fiber';
import { Vector3, MathUtils, PerspectiveCamera } from 'three';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { world } from '../ecs';

const localPlayers = world.with('rigidBody', 'isMe');

const targetPosition = new Vector3();
const previousTarget = new Vector3();
const targetShift = new Vector3();
const cameraRight = new Vector3();

export const CameraFollowSystem = () => {
  // === ПАМЯТЬ КАМЕРЫ ===
  const wasAiming = useRef(false);
  const preAimDistance = useRef(5.0); // Дистанция до прицеливания
  const preAimFov = useRef(60); // Угол обзора до прицеливания
  const isRestoring = useRef(false); // Флаг возврата на исходную

  useFrame((state, delta) => {
    const controls = state.controls as unknown as OrbitControlsImpl;
    const camera = state.camera as PerspectiveCamera;

    for (const entity of localPlayers) {
      if (!entity.isMe || !entity.rigidBody) continue;

      const playerPos = entity.rigidBody.translation();

      if (controls) {
        controls.minDistance = 1.5;
        controls.maxDistance = 20.0;

        const currentDist = camera.position.distanceTo(controls.target);

        // === ОТСЛЕЖИВАЕМ НАЧАЛО И КОНЕЦ ПРИЦЕЛИВАНИЯ ===
        if (entity.isAiming && !wasAiming.current) {
          wasAiming.current = true;
          isRestoring.current = false;
          // Запоминаем настройки игрока в момент ПЕРЕД зумом
          preAimDistance.current = currentDist;
          preAimFov.current = camera.fov;
        } else if (!entity.isAiming && wasAiming.current) {
          wasAiming.current = false;
          // Игрок отпустил кнопку — запускаем процесс возврата
          isRestoring.current = true;
        }

        // Вычисляем фокус и смещение вправо
        const targetHeight = entity.isAiming ? 2 : 1.2;
        targetPosition.set(playerPos.x, playerPos.y + targetHeight, playerPos.z);

        if (entity.isAiming) {
          cameraRight.set(1, 0, 0).applyQuaternion(camera.quaternion);
          cameraRight.y = 0;
          cameraRight.normalize();
          targetPosition.add(cameraRight.multiplyScalar(1.1));
        }

        previousTarget.copy(controls.target);
        controls.target.lerp(targetPosition, delta * 12);
        targetShift.subVectors(controls.target, previousTarget);
        camera.position.add(targetShift);

        // === УПРАВЛЕНИЕ ЗУМОМ ===
        if (entity.isAiming) {
          // Наезжаем камерой за плечо
          const newDist = MathUtils.lerp(currentDist, 3.0, delta * 8);
          const dir = new Vector3().subVectors(camera.position, controls.target).normalize();
          camera.position.copy(controls.target).add(dir.multiplyScalar(newDist));

          camera.fov = MathUtils.lerp(camera.fov, 40, delta * 10);
          controls.minPolarAngle = 0.1;
          controls.maxPolarAngle = Math.PI - 0.1;
        } else {
          // === УМНЫЙ ВОЗВРАТ ===
          if (isRestoring.current) {
            // Плавно откатываем дистанцию к той, что была сохранена в preAimDistance
            const newDist = MathUtils.lerp(currentDist, preAimDistance.current, delta * 5);
            const dir = new Vector3().subVectors(camera.position, controls.target).normalize();
            camera.position.copy(controls.target).add(dir.multiplyScalar(newDist));

            // Как только мы почти достигли старой позиции (разница меньше 5 см),
            // мы отключаем форсирование. Это возвращает свободу колесику мыши!
            if (Math.abs(currentDist - preAimDistance.current) < 0.05) {
              isRestoring.current = false;
            }
          }

          // Плавно возвращаем сохраненный FOV
          camera.fov = MathUtils.lerp(camera.fov, preAimFov.current, delta * 10);

          controls.minPolarAngle = 0;
          controls.maxPolarAngle = Math.PI / 2 + 0.1;
        }

        camera.updateProjectionMatrix();
        controls.update();
      }
    }
  });

  return null;
};
