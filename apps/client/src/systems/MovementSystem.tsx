import { useFrame } from '@react-three/fiber';
import { useKeyboardControls } from '@react-three/drei';
import { Vector3, Quaternion } from 'three';
import { useRef, useEffect } from 'react'; // <-- Добавили useEffect
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
  const groundedFrames = useRef(0);

  // === СЛУШАЕМ КЛИКИ (Универсальная привязка действий) ===
  useEffect(() => {
    const handleMouseDown = (e: MouseEvent) => {
      const player = localPlayers.first;

      if (
        !player ||
        (player.actionTimer && player.actionTimer > 0) ||
        player.currentAnimation === 'Roll'
      )
        return;

      if (e.button === 0) {
        // --- ЛОГИКА ВОИНА ---
        if (player.classType === 'Warrior') {
          player.currentAnimation = 'Sword_Attack';
          player.actionTimer = 0.6;
          // (Удар ближнего боя пока просто проигрывает анимацию)
        }

        // --- ЛОГИКА РЕЙНДЖЕРА ---
        else if (player.classType === 'Ranger') {
          player.currentAnimation = 'Bow_Shoot';
          player.actionTimer = 0.5;

          // Спавним стрелу только для Рейнджера
          if (player.rigidBody && player.threeObject) {
            const playerPos = player.rigidBody.translation();
            const forward = new Vector3(0, 0, 1).applyQuaternion(player.threeObject.quaternion);
            const arrowSpeed = 25;

            const arrowData = {
              id: Math.random().toString(36).substr(2, 9),
              isProjectile: true,
              position: { x: playerPos.x, y: playerPos.y + 1, z: playerPos.z },
              velocity: {
                x: forward.x * arrowSpeed,
                y: forward.y * arrowSpeed,
                z: forward.z * arrowSpeed,
              },
              lifeTime: 2,
            };

            world.add(arrowData);
            socket.emit('shoot', arrowData);
          }
        }
      }
    };

    window.addEventListener('mousedown', handleMouseDown);
    return () => window.removeEventListener('mousedown', handleMouseDown);
  }, []);

  useFrame((state, delta) => {
    const { forward, backward, left, right, jump } = get();

    for (const entity of localPlayers) {
      if (!entity.isMe || !entity.rigidBody || !entity.threeObject) continue;

      const body = entity.rigidBody;
      const currentVelocity = body.linvel();

      let isActionLocked = false;
      if (entity.actionTimer !== undefined && entity.actionTimer > 0) {
        entity.actionTimer -= delta;
        isActionLocked = true; // Мы заняты (например, бьем мечом)
      }

      // Если мы атакуем, скорость 0 (стоим на месте), иначе 5 (бежим)
      const speed = isActionLocked ? 0 : 5;

      if (Math.abs(currentVelocity.y) < 0.05) {
        groundedFrames.current += 1;
      } else {
        groundedFrames.current = 0;
      }

      const isGrounded = groundedFrames.current > 3;

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

      if (isMoving && !isActionLocked) {
        // Поворачиваемся, только если не бьем
        const targetAngle = Math.atan2(direction.x, direction.z);
        targetQuaternion.setFromAxisAngle(upVector, targetAngle);
        entity.threeObject.quaternion.slerp(targetQuaternion, delta * 15);
      }

      direction.normalize().multiplyScalar(speed);
      body.setLinvel({ x: direction.x, y: currentVelocity.y, z: direction.z }, true);

      // Прыгать во время атаки нельзя
      if (jump && isGrounded && !isActionLocked) {
        body.applyImpulse({ x: 0, y: 8, z: 0 }, true);
        groundedFrames.current = 0;
      }

      // === ВЫБИРАЕМ АНИМАЦИЮ (Удар в приоритете) ===
      const isAirborne = !isGrounded && groundedFrames.current === 0;

      const nextAnimation = 'Idle';
      if (!isActionLocked) {
        let nextAnim = 'Idle';
        if (isAirborne) {
          nextAnim = 'Roll';
        } else if (isMoving) {
          nextAnim = 'Run';
        }
        entity.currentAnimation = nextAnim;
      }

      // === СЕТЕВАЯ СИНХРОНИЗАЦИЯ ===
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
