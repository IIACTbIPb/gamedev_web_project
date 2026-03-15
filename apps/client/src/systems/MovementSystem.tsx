import { useFrame } from '@react-three/fiber';
import { useKeyboardControls } from '@react-three/drei';
import { Vector3, Quaternion } from 'three';
import { useRef } from 'react';
import { world } from '../ecs';
import { socket } from '../socket';

const localPlayers = world.with('rigidBody', 'isMe', 'threeObject');

const direction = new Vector3();
const frontVector = new Vector3();
const sideVector = new Vector3();
const upVector = new Vector3(0, 1, 0);
const targetQuaternion = new Quaternion();

export const MovementSystem = () => {
  const [, get] = useKeyboardControls();

  const lastPosition = useRef(new Vector3());
  const lastRotation = useRef(new Quaternion());
  const lastAnimation = useRef<string>('Idle');

  // Добавляем счетчик кадров для надежной проверки земли
  const groundedFrames = useRef(0);

  useFrame((state, delta) => {
    const { forward, backward, left, right, jump } = get();

    for (const entity of localPlayers) {
      if (!entity.isMe || !entity.rigidBody || !entity.threeObject) continue;

      const body = entity.rigidBody;
      const speed = 5;
      const currentVelocity = body.linvel();

      // === 1. УМНАЯ ПРОВЕРКА НА ЗЕМЛЮ ===
      // Если мы по оси Y почти не двигаемся, увеличиваем счетчик
      if (Math.abs(currentVelocity.y) < 0.05) {
        groundedFrames.current += 1;
      } else {
        groundedFrames.current = 0; // Если летим - сбрасываем в 0
      }

      // Считаем себя на земле, только если стоим ровно больше 3 кадров
      const isGrounded = groundedFrames.current > 3;

      // === 2. ВЫЧИСЛЯЕМ ВЕКТОР ДВИЖЕНИЯ ===
      state.camera.getWorldDirection(frontVector);
      frontVector.y = 0;
      frontVector.normalize();

      sideVector.copy(frontVector).cross(state.camera.up).normalize();

      direction.set(0, 0, 0);
      if (forward) direction.add(frontVector);
      if (backward) direction.sub(frontVector);
      if (right) direction.add(sideVector);
      if (left) direction.sub(sideVector);

      const isMoving = direction.lengthSq() > 0;

      // === 3. ФИЗИКА (ПОВОРОТ, БЕГ, ПРЫЖОК) ===
      if (isMoving) {
        const targetAngle = Math.atan2(direction.x, direction.z);
        targetQuaternion.setFromAxisAngle(upVector, targetAngle);
        entity.threeObject.quaternion.slerp(targetQuaternion, delta * 15);
      }

      direction.normalize().multiplyScalar(speed);
      body.setLinvel({ x: direction.x, y: currentVelocity.y, z: direction.z }, true);

      // Прыгаем, только если мы надежно стоим на земле
      if (jump && isGrounded) {
        body.applyImpulse({ x: 0, y: 30, z: 0 }, true);
        groundedFrames.current = 0; // Моментально сбрасываем счетчик, чтобы перейти в состояние полета
      }

      // === 4. АНИМАЦИИ ===
      // Теперь мы в воздухе всегда, когда не на земле (никаких прерываний в апексе!)
      const isAirborne = !isGrounded && groundedFrames.current === 0;

      let nextAnimation = 'Idle';
      if (isAirborne) {
        nextAnimation = 'Roll';
      } else if (isMoving) {
        nextAnimation = 'Run';
      }

      entity.currentAnimation = nextAnimation;

      // === 5. СЕТЕВАЯ СИНХРОНИЗАЦИЯ ===
      const currentPos = body.translation();
      const currentRot = entity.threeObject.quaternion;

      const posChanged = lastPosition.current.distanceToSquared(currentPos) > 0.001;
      const rotChanged = lastRotation.current.angleTo(currentRot) > 0.01;
      const animChanged = nextAnimation !== lastAnimation.current;

      if (posChanged || rotChanged || animChanged) {
        socket.emit('move', {
          position: currentPos,
          rotation: [currentRot.x, currentRot.y, currentRot.z, currentRot.w],
          animation: nextAnimation,
        });

        lastPosition.current.copy(currentPos);
        lastRotation.current.copy(currentRot);
        lastAnimation.current = nextAnimation;
      }
    }
  });

  return null;
};
