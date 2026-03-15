import { useFrame } from '@react-three/fiber';
import { useKeyboardControls } from '@react-three/drei';
import { Vector3, Quaternion } from 'three'; // <-- Импортировали Quaternion
import { useRef } from 'react';
import { world } from '../ecs';
import { socket } from '../socket';

// Теперь нам нужен еще и threeObject (сама визуальная модель)
const localPlayers = world.with('rigidBody', 'isMe', 'threeObject');

const direction = new Vector3();
const frontVector = new Vector3();
const sideVector = new Vector3();
const upVector = new Vector3(0, 1, 0); // Ось Y, вокруг которой будем крутиться
const targetQuaternion = new Quaternion(); // Математический объект для целевого поворота

export const MovementSystem = () => {
  const [, get] = useKeyboardControls();
  const lastPosition = useRef(new Vector3());
  const lastRotation = useRef(new Quaternion()); // Храним прошлый поворот

  // Добавили параметр delta для плавной анимации поворота
  useFrame((state, delta) => {
    const { forward, backward, left, right, jump } = get();

    for (const entity of localPlayers) {
      if (!entity.isMe || !entity.rigidBody || !entity.threeObject) continue;

      const body = entity.rigidBody;
      const speed = 5;
      const currentVelocity = body.linvel();

      state.camera.getWorldDirection(frontVector);
      frontVector.y = 0;
      frontVector.normalize();

      sideVector.copy(frontVector).cross(state.camera.up).normalize();

      direction.set(0, 0, 0);
      if (forward) direction.add(frontVector);
      if (backward) direction.sub(frontVector);
      if (right) direction.add(sideVector);
      if (left) direction.sub(sideVector);

      // --- ПЛАВНЫЙ ПОВОРОТ КУБИКА ---
      if (direction.lengthSq() > 0) {
        // 1. Вычисляем угол (в радианах) между осями X и Z (куда мы идем)
        const targetAngle = Math.atan2(direction.x, direction.z);
        // 2. Устанавливаем целевой поворот вокруг оси Y
        targetQuaternion.setFromAxisAngle(upVector, targetAngle);
        // 3. Плавно (slerp) вращаем визуальный кубик к нужному углу
        entity.threeObject.quaternion.slerp(targetQuaternion, delta * 15);
      }

      direction.normalize().multiplyScalar(speed);
      body.setLinvel({ x: direction.x, y: currentVelocity.y, z: direction.z }, true);

      if (jump && Math.abs(currentVelocity.y) < 0.1) {
        body.applyImpulse({ x: 0, y: 5, z: 0 }, true);
      }

      // --- СЕТЕВАЯ СИНХРОНИЗАЦИЯ (теперь с поворотом) ---
      const currentPos = body.translation();
      const currentRot = entity.threeObject.quaternion;

      // Отправляем пакет на сервер, если сдвинулись или сильно повернулись
      const posChanged = lastPosition.current.distanceToSquared(currentPos) > 0.001;
      const rotChanged = lastRotation.current.angleTo(currentRot) > 0.01;

      if (posChanged || rotChanged) {
        socket.emit('move', {
          position: currentPos,
          // Кватернион передаем как обычный массив из 4 чисел
          rotation: [currentRot.x, currentRot.y, currentRot.z, currentRot.w],
        });

        lastPosition.current.copy(currentPos);
        lastRotation.current.copy(currentRot);
      }
    }
  });

  return null;
};
