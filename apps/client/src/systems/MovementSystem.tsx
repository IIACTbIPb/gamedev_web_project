import { useFrame, useThree } from '@react-three/fiber';
import { useKeyboardControls } from '@react-three/drei';
import { Vector3, Quaternion } from 'three';
import { useRef, useEffect } from 'react';
import { ECS } from '@/ecs';
import { socket } from '@/socket';
import { CLASSES_CONFIG } from '@/classesConfig';
import { useUIStore } from '@/store';
// === ИМПОРТИРУЕМ НАШ БАЛАНС ИЗ SHARED ПАКЕТА ===
import { CLASS_BALANCE, type AnyAnimation } from '@game/shared';

// === 1. ГЕЙМПЛЕЙНЫЕ КОНСТАНТЫ ===
const CONFIG = {
  // BASE_SPEED убран, теперь он берется из CLASS_BALANCE
  JUMP_FORCE: 8,
  ROTATION_SPEED_MOVING: 15,
  ROTATION_SPEED_AIMING: 20,
  GROUNDED_Y_VEL_THRESHOLD: 0.05,
  GROUNDED_FRAMES_MIN: 3,
  NETWORK_SYNC_POS_TOLERANCE: 0.001,
  NETWORK_SYNC_ROT_TOLERANCE: 0.01,
  FORWARD_JUMP_FORCE: 10
};

// === 2. ГЛОБАЛЬНЫЕ ВЕКТОРЫ (Оптимизация памяти) ===
const direction = new Vector3();
const frontVector = new Vector3();
const sideVector = new Vector3();
const upVector = new Vector3(0, 1, 0);
const targetQuaternion = new Quaternion();
const tempPos = new Vector3();
const forwardDir = new Vector3(0, 0, 1);

const localPlayers = ECS.world
  .with('rigidBody', 'isMe', 'threeObject')
  .where((e) => e.isMe === true);

export type Controls = 'forward' | 'backward' | 'left' | 'right' | 'jump' | 'skill1' | 'skill2';

export const MovementSystem = () => {
  const [, get] = useKeyboardControls<Controls>();
  const { camera } = useThree();

  const groundedFrames = useRef(0);

  // === 3. ГРУППИРОВКА СЕТЕВОГО СОСТОЯНИЯ ===
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
    // ... этот код остается без изменений ...
    const handleMouseAction = (e: MouseEvent, isDown: boolean) => {
      if (e.button !== 0 || (e.target as HTMLElement).tagName !== 'CANVAS') return;

      const player = localPlayers.first;
      if (!player || !player.classType || player.currentAnimation === 'Roll') return;

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

    // === ДОСТАЕМ БАЗОВУЮ СКОРОСТЬ КЛАССА ИЗ КОНФИГА ===
    // Если по какой-то причине класса нет, делаем фолбэк на 5
    const baseSpeed = player.classType ? CLASS_BALANCE[player.classType].baseSpeed : 5;

    // --- Б. ОБНОВЛЕНИЕ ТАЙМЕРОВ (Action Lock и Speed Buffs) ---
    let isActionLocked = false;
    if (player.actionTimer !== undefined && player.actionTimer > 0) {
      player.actionTimer -= delta;
      isActionLocked = true;
    }

    let currentSpeed = baseSpeed; // <-- Используем скорость из баланса!
    let isSprinting = false;

    if (player.speedBuffTimer !== undefined && player.speedBuffTimer > 0) {
      player.speedBuffTimer -= delta;
      currentSpeed = player.speed || baseSpeed; // <-- Фолбэк на базовую
      isSprinting = true;
    } else {
      player.speedBuffTimer = 0;
      player.speed = baseSpeed; // <-- Возвращаем в дефолт после спринта
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
            break;
          }
        }
      }
    }

    // --- Г. ФИЗИКА, ВЕКТОРЫ И ДВИЖЕНИЕ (Locomotion) ---
    const currentVelocity = body.linvel();

    const isGroundedVelocity = Math.abs(currentVelocity.y) < CONFIG.GROUNDED_Y_VEL_THRESHOLD;
    groundedFrames.current = isGroundedVelocity ? groundedFrames.current + 1 : 0;
    const isGrounded = groundedFrames.current > CONFIG.GROUNDED_FRAMES_MIN;

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

    if (player.isAiming) {
      const targetAngle = Math.atan2(frontVector.x, frontVector.z);
      targetQuaternion.setFromAxisAngle(upVector, targetAngle);
      player.threeObject.quaternion.slerp(targetQuaternion, delta * CONFIG.ROTATION_SPEED_AIMING);
    } else if (isMoving && !isActionLocked) {
      const targetAngle = Math.atan2(direction.x, direction.z);
      targetQuaternion.setFromAxisAngle(upVector, targetAngle);
      player.threeObject.quaternion.slerp(targetQuaternion, delta * CONFIG.ROTATION_SPEED_MOVING);
    }

    direction.normalize().multiplyScalar(currentSpeed);

    if (isGrounded) {
      body.setLinvel({ x: direction.x, y: currentVelocity.y, z: direction.z }, true);
    } else {
      const airControl = 0.05;
      const newX = currentVelocity.x + (direction.x - currentVelocity.x) * airControl;
      const newZ = currentVelocity.z + (direction.z - currentVelocity.z) * airControl;
      body.setLinvel({ x: newX, y: currentVelocity.y, z: newZ }, true);
    }

    if (keys.jump && isGrounded && !isActionLocked) {
      forwardDir.set(0, 0, 1)
        .applyQuaternion(player.threeObject.quaternion)
        .normalize();

      body.applyImpulse({
        x: forwardDir.x * CONFIG.FORWARD_JUMP_FORCE,
        y: CONFIG.JUMP_FORCE,
        z: forwardDir.z * CONFIG.FORWARD_JUMP_FORCE
      }, true);

      groundedFrames.current = 0;

      const classLogic = CLASSES_CONFIG[player.classType!];
      if (classLogic) {
        player.currentAnimation = classLogic.locomotion.airborne as AnyAnimation;
      }
    }

    const isAirborne = !isGrounded && groundedFrames.current === 0;

    // --- Д. АНИМАЦИИ ---
    if (!isActionLocked && !player.isAiming && player.classType) {
      const classLogic = CLASSES_CONFIG[player.classType];

      if (classLogic) {
        if (groundedFrames.current > 0) {
          player.currentAnimation = isMoving
            ? classLogic.locomotion.run as AnyAnimation
            : classLogic.locomotion.idle as AnyAnimation;
        } else if (isAirborne) {
          player.currentAnimation = classLogic.locomotion.airborne as AnyAnimation;
        }
      }
    }

    // --- Е. СЕТЕВАЯ СИНХРОНИЗАЦИЯ ---
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