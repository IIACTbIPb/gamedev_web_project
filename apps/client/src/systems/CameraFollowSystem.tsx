import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Vector3, MathUtils, PerspectiveCamera } from 'three';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { ECS } from '@/ecs';

const localPlayers = ECS.world.with('rigidBody', 'isMe').where((e) => e.isMe === true);

const targetPosition = new Vector3();
const previousTarget = new Vector3();
const targetShift = new Vector3();
const cameraRight = new Vector3();

export const CameraFollowSystem = () => {
  const wasAiming = useRef(false);
  const preAimDistance = useRef(5.0);
  const preAimFov = useRef(60);
  const isRestoring = useRef(false);

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

        if (entity.isAiming && !wasAiming.current) {
          wasAiming.current = true;
          isRestoring.current = false;
          preAimDistance.current = currentDist;
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

        previousTarget.copy(controls.target);
        controls.target.lerp(targetPosition, delta * 12);
        targetShift.subVectors(controls.target, previousTarget);
        camera.position.add(targetShift);

        if (entity.isAiming) {
          const newDist = MathUtils.lerp(currentDist, 3.0, delta * 8);
          const dir = new Vector3().subVectors(camera.position, controls.target).normalize();
          camera.position.copy(controls.target).add(dir.multiplyScalar(newDist));

          camera.fov = MathUtils.lerp(camera.fov, 40, delta * 10);
          controls.minPolarAngle = 0.1;
          controls.maxPolarAngle = Math.PI - 0.1;
        } else {
          if (isRestoring.current) {
            const newDist = MathUtils.lerp(currentDist, preAimDistance.current, delta * 5);
            const dir = new Vector3().subVectors(camera.position, controls.target).normalize();
            camera.position.copy(controls.target).add(dir.multiplyScalar(newDist));

            if (Math.abs(currentDist - preAimDistance.current) < 0.05) {
              isRestoring.current = false;
            }
          }

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
