import { useFrame, useThree } from '@react-three/fiber';
import { useKeyboardControls } from '@react-three/drei';
import { Vector3, Quaternion } from 'three';
import { useRef, useEffect } from 'react';
import { ECS } from '../ecs';
import { socket } from '../socket';
import { CLASSES_CONFIG } from '../classesConfig';
import type { BaseAnimation } from '@game/shared';
import { useUIStore } from '../store';

const localPlayers = ECS.world
  .with('rigidBody', 'isMe', 'threeObject')
  .where((e) => e.isMe === true);

const direction = new Vector3();
const frontVector = new Vector3();
const sideVector = new Vector3();
const upVector = new Vector3(0, 1, 0);
const targetQuaternion = new Quaternion();
const tempPos = new Vector3();

export type Controls = 'forward' | 'backward' | 'left' | 'right' | 'jump' | 'skill1' | 'skill2';

export const MovementSystem = () => {
  const [, get] = useKeyboardControls<Controls>();
  const { camera } = useThree();

  const lastPosition = useRef(new Vector3());
  const lastRotation = useRef(new Quaternion());
  const lastAnimation = useRef<string>('Idle');
  const lastAiming = useRef<boolean>(false);
  const lastInvisible = useRef<boolean>(false);
  const lastSprinting = useRef<boolean>(false)
  const groundedFrames = useRef(0);

  useEffect(() => {
    const handleMouseDown = (e: MouseEvent) => {
      if (e.button !== 0) return;
      const player = localPlayers.first;
      if (!player || !player.isMe || !player.classType || player.currentAnimation === 'Roll')
        return;
      if (player.actionTimer && player.actionTimer > 0 && !player.isAiming) return;
      if ((e.target as HTMLElement).tagName !== 'CANVAS') return;

      const classLogic = CLASSES_CONFIG[player.classType];
      classLogic?.onPrimaryAttackStart(player);
    };

    const handleMouseUp = (e: MouseEvent) => {
      if (e.button !== 0) return;
      const player = localPlayers.first;
      if (!player || !player.isMe || !player.classType) return;
      if ((e.target as HTMLElement).tagName !== 'CANVAS') return;

      const classLogic = CLASSES_CONFIG[player.classType];
      classLogic?.onPrimaryAttackRelease?.(player, camera);
    };

    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [camera]);

  useFrame((state, delta) => {
    const keys = get();
    const { forward, backward, left, right, jump } = keys;

    for (const entity of localPlayers) {
      if (!entity.isMe || !entity.rigidBody || !entity.threeObject) continue;

      if (entity.hp !== undefined && entity.hp <= 0) {
        entity.rigidBody.setLinvel({ x: 0, y: entity.rigidBody.linvel().y, z: 0 }, true);
        continue; // Пропускаем всю логику управления!
      }
      const body = entity.rigidBody;
      const currentVelocity = body.linvel();

      let isActionLocked = false;
      if (entity.actionTimer !== undefined && entity.actionTimer > 0) {
        entity.actionTimer -= delta;
        isActionLocked = true;
      }

      let baseSpeed = 5; // Базовая скорость всех персонажей

      if (entity.speedBuffTimer !== undefined && entity.speedBuffTimer > 0) {
        // Если таймер работает, отнимаем время
        entity.speedBuffTimer -= delta;

        // Если в сущности задана кастомная скорость, используем её
        if (entity.speed) {
          baseSpeed = entity.speed;
        }
      } else {
        // Если таймер закончился (или его не было), возвращаем скорость в норму
        entity.speedBuffTimer = 0;
        entity.speed = 5;
      }

      if (!isActionLocked && entity.classType) {
        const classLogic = CLASSES_CONFIG[entity.classType];

        if (classLogic?.skills) {
          for (let i = 0; i < classLogic.skills.length; i++) {
            const skill = classLogic.skills[i];
            const keyName = skill.id as keyof typeof keys; // skill1, skill2 etc

            if (keys[keyName]) {
              // Check cooldown
              if (!useUIStore.getState().cooldowns[skill.id]) {
                skill.onUse(entity);
                isActionLocked = true;
                useUIStore.getState().startCooldown(skill.id, skill.cooldown);
                break; // Execute only one skill per frame
              }
            }
          }
        }
      }

      const speed = isActionLocked ? 0 : baseSpeed;

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

      if (entity.isAiming) {
        const targetAngle = Math.atan2(frontVector.x, frontVector.z);
        targetQuaternion.setFromAxisAngle(upVector, targetAngle);
        entity.threeObject.quaternion.slerp(targetQuaternion, delta * 20);
      } else if (isMoving && !isActionLocked) {
        const targetAngle = Math.atan2(direction.x, direction.z);
        targetQuaternion.setFromAxisAngle(upVector, targetAngle);
        entity.threeObject.quaternion.slerp(targetQuaternion, delta * 15);
      }

      direction.normalize().multiplyScalar(speed);
      body.setLinvel({ x: direction.x, y: currentVelocity.y, z: direction.z }, true);

      if (jump && isGrounded && !isActionLocked) {
        body.applyImpulse({ x: 0, y: 8, z: 0 }, true);
        groundedFrames.current = 0;
      }

      const isAirborne = !isGrounded && groundedFrames.current === 0;

      if (!isActionLocked && !entity.isAiming) {
        let nextAnim: BaseAnimation = 'Idle';
        if (isAirborne) {
          nextAnim = 'Roll';
        } else if (isMoving) {
          nextAnim = 'Run';
        }
        entity.currentAnimation = nextAnim;
      }

      const currentPos = body.translation();
      const currentRot = entity.threeObject.quaternion;
      const currentAnim = entity.currentAnimation || 'Idle';
      const currentAiming = !!entity.isAiming;
      const currentInvisible = !!entity.isInvisible;
      const currentSprinting = entity.speedBuffTimer !== undefined && entity.speedBuffTimer > 0;




      tempPos.set(currentPos.x, currentPos.y, currentPos.z);

      const posChanged = lastPosition.current.distanceToSquared(tempPos) > 0.001;
      const rotChanged = lastRotation.current.angleTo(currentRot) > 0.01;
      const animChanged = currentAnim !== lastAnimation.current;
      const aimingChanged = currentAiming !== lastAiming.current;
      const invisibleChanged = currentInvisible !== lastInvisible.current;
      const sprintingChanged = currentSprinting !== lastSprinting.current;

      if (posChanged || rotChanged || animChanged || aimingChanged || invisibleChanged || sprintingChanged) {
        socket.emit('move', {
          position: currentPos,
          rotation: [currentRot.x, currentRot.y, currentRot.z, currentRot.w],
          animation: currentAnim,
          isAiming: currentAiming,
          isInvisible: currentInvisible,
          isSprinting: currentSprinting,
        });

        lastPosition.current.copy(tempPos);
        lastRotation.current.copy(currentRot);
        lastAnimation.current = currentAnim;
        lastAiming.current = currentAiming;
        lastInvisible.current = currentInvisible;
        lastSprinting.current = currentSprinting;
      }
    }
  });

  return null;
};
