import { useFrame, useThree } from '@react-three/fiber';
import { useKeyboardControls } from '@react-three/drei';
import { Vector3, Quaternion } from 'three';
import { useRef, useEffect } from 'react';
import { ECS } from '../ecs';
import { socket } from '../socket';
import { CLASSES_CONFIG } from '../classesConfig';
import { useUIStore } from '../store';

// === 1. ГЕЙМПЛЕЙНЫЕ КОНСТАНТЫ ===
// Легко балансировать игру из одного места
const CONFIG = {
  BASE_SPEED: 5,
  JUMP_FORCE: 8,
  ROTATION_SPEED_MOVING: 15,
  ROTATION_SPEED_AIMING: 20,
  GROUNDED_Y_VEL_THRESHOLD: 0.05,
  GROUNDED_FRAMES_MIN: 3, // Сколько кадров нужно быть на земле, чтобы разрешить прыжок
  NETWORK_SYNC_POS_TOLERANCE: 0.001,
  NETWORK_SYNC_ROT_TOLERANCE: 0.01,
};

// === 2. ГЛОБАЛЬНЫЕ ВЕКТОРЫ (Оптимизация памяти) ===
const direction = new Vector3();
const frontVector = new Vector3();
const sideVector = new Vector3();
const upVector = new Vector3(0, 1, 0);
const targetQuaternion = new Quaternion();
const tempPos = new Vector3();

const localPlayers = ECS.world
  .with('rigidBody', 'isMe', 'threeObject')
  .where((e) => e.isMe === true);

export type Controls = 'forward' | 'backward' | 'left' | 'right' | 'jump' | 'skill1' | 'skill2';

export const MovementSystem = () => {
  const [, get] = useKeyboardControls<Controls>();
  const { camera } = useThree();

  const groundedFrames = useRef(0);

  // === 3. ГРУППИРОВКА СЕТЕВОГО СОСТОЯНИЯ ===
  // Вместо 6 разных useRef храним всё в одном объекте
  const lastSync = useRef({
    position: new Vector3(),
    rotation: new Quaternion(),
    animation: 'Idle',
    isAiming: false,
    isInvisible: false,
    isSprinting: false,
  });

  // === 4. ОБРАБОТКА МЫШИ (АТАКИ) ===
  useEffect(() => {
    const handleMouseAction = (e: MouseEvent, isDown: boolean) => {
      if (e.button !== 0 || (e.target as HTMLElement).tagName !== 'CANVAS') return;

      const player = localPlayers.first;
      if (!player || !player.classType || player.currentAnimation === 'Roll') return;

      // Блокируем новые атаки, если идет старая
      if (isDown && player.actionTimer && player.actionTimer > 0 && !player.isAiming) return;

      const classLogic = CLASSES_CONFIG[player.classType];
      if (isDown) {
        classLogic?.onPrimaryAttackStart(player);
      } else {
        classLogic?.onPrimaryAttackRelease?.(player, camera);
      }
    };

    const onDown = (e: MouseEvent) => handleMouseAction(e, true);
    const onUp = (e: MouseEvent) => handleMouseAction(e, false);

    window.addEventListener('mousedown', onDown);
    window.addEventListener('mouseup', onUp);

    return () => {
      window.removeEventListener('mousedown', onDown);
      window.removeEventListener('mouseup', onUp);
    };
  }, [camera]);

  // === 5. ОСНОВНОЙ ИГРОВОЙ ЦИКЛ ===
  useFrame((state, delta) => {
    const player = localPlayers.first;
    if (!player || !player.rigidBody || !player.threeObject) return;

    const body = player.rigidBody;

    // --- А. ПРОВЕРКА СМЕРТИ ---
    if (player.hp !== undefined && player.hp <= 0) {
      body.setLinvel({ x: 0, y: body.linvel().y, z: 0 }, true);
      return;
    }

    // --- Б. ОБНОВЛЕНИЕ ТАЙМЕРОВ (Action Lock и Speed Buffs) ---
    let isActionLocked = false;
    if (player.actionTimer !== undefined && player.actionTimer > 0) {
      player.actionTimer -= delta;
      isActionLocked = true;
    }

    let currentSpeed = CONFIG.BASE_SPEED;
    let isSprinting = false;

    if (player.speedBuffTimer !== undefined && player.speedBuffTimer > 0) {
      player.speedBuffTimer -= delta;
      currentSpeed = player.speed || CONFIG.BASE_SPEED;
      isSprinting = true;
    } else {
      player.speedBuffTimer = 0;
      player.speed = CONFIG.BASE_SPEED;
    }

    if (isActionLocked) currentSpeed = 0;

    // --- В. ПРИМЕНЕНИЕ НАВЫКОВ (Skills) ---
    const keys = get();
    if (!isActionLocked && player.classType) {
      const skills = CLASSES_CONFIG[player.classType]?.skills;
      if (skills) {
        for (const skill of skills) {
          const keyName = skill.id as keyof typeof keys;
          if (keys[keyName] && !useUIStore.getState().cooldowns[skill.id]) {
            skill.onUse(player);
            isActionLocked = true;
            useUIStore.getState().startCooldown(skill.id, skill.cooldown);
            break; // Разрешаем использовать только 1 скилл за кадр
          }
        }
      }
    }

    // --- Г. ФИЗИКА, ВЕКТОРЫ И ДВИЖЕНИЕ (Locomotion) ---
    const currentVelocity = body.linvel();

    // Проверка падения/приземления
    const isGroundedVelocity = Math.abs(currentVelocity.y) < CONFIG.GROUNDED_Y_VEL_THRESHOLD;
    groundedFrames.current = isGroundedVelocity ? groundedFrames.current + 1 : 0;
    const isGrounded = groundedFrames.current > CONFIG.GROUNDED_FRAMES_MIN;

    // Вычисляем направление от камеры
    state.camera.getWorldDirection(frontVector);
    frontVector.y = 0;
    frontVector.normalize();
    sideVector.copy(frontVector).cross(state.camera.up).normalize();

    direction.set(0, 0, 0);
    if (keys.forward) direction.add(frontVector);
    if (keys.backward) direction.sub(frontVector);
    if (keys.right) direction.add(sideVector);
    if (keys.left) direction.sub(sideVector);

    const isMoving = direction.lengthSq() > 0;

    // Вращение модели
    if (player.isAiming) {
      const targetAngle = Math.atan2(frontVector.x, frontVector.z);
      targetQuaternion.setFromAxisAngle(upVector, targetAngle);
      player.threeObject.quaternion.slerp(targetQuaternion, delta * CONFIG.ROTATION_SPEED_AIMING);
    } else if (isMoving && !isActionLocked) {
      const targetAngle = Math.atan2(direction.x, direction.z);
      targetQuaternion.setFromAxisAngle(upVector, targetAngle);
      player.threeObject.quaternion.slerp(targetQuaternion, delta * CONFIG.ROTATION_SPEED_MOVING);
    }

    // Движение вперед
    direction.normalize().multiplyScalar(currentSpeed);
    body.setLinvel({ x: direction.x, y: currentVelocity.y, z: direction.z }, true);

    // Прыжок
    if (keys.jump && isGrounded && !isActionLocked) {
      body.applyImpulse({ x: 0, y: CONFIG.JUMP_FORCE, z: 0 }, true);
      groundedFrames.current = 0;
    }

    const isAirborne = !isGrounded && groundedFrames.current === 0;

    // --- Д. АНИМАЦИИ ---
    if (!isActionLocked && !player.isAiming) {
      player.currentAnimation = isAirborne ? 'Roll' : (isMoving ? 'Run' : 'Idle');
    }

    // --- Е. СЕТЕВАЯ СИНХРОНИЗАЦИЯ (Network Diffing) ---
    const currentPos = body.translation();
    const currentRot = player.threeObject.quaternion;
    const currentAnim = player.currentAnimation || 'Idle';
    const currentAiming = !!player.isAiming;
    const currentInvisible = !!player.isInvisible;

    tempPos.set(currentPos.x, currentPos.y, currentPos.z);
    const sync = lastSync.current;

    const posChanged = sync.position.distanceToSquared(tempPos) > CONFIG.NETWORK_SYNC_POS_TOLERANCE;
    const rotChanged = sync.rotation.angleTo(currentRot) > CONFIG.NETWORK_SYNC_ROT_TOLERANCE;
    const animChanged = currentAnim !== sync.animation;
    const aimingChanged = currentAiming !== sync.isAiming;
    const invisibleChanged = currentInvisible !== sync.isInvisible;
    const sprintingChanged = isSprinting !== sync.isSprinting;

    if (posChanged || rotChanged || animChanged || aimingChanged || invisibleChanged || sprintingChanged) {
      socket.emit('move', {
        position: currentPos,
        rotation: [currentRot.x, currentRot.y, currentRot.z, currentRot.w],
        animation: currentAnim,
        isAiming: currentAiming,
        isInvisible: currentInvisible,
        isSprinting: isSprinting,
      });

      // Сохраняем последнее отправленное состояние
      sync.position.copy(tempPos);
      sync.rotation.copy(currentRot);
      sync.animation = currentAnim;
      sync.isAiming = currentAiming;
      sync.isInvisible = currentInvisible;
      sync.isSprinting = isSprinting;
    }
  });

  return null;
};