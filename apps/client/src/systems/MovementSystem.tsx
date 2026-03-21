import { useFrame, useThree } from '@react-three/fiber';
import { useKeyboardControls } from '@react-three/drei';
import { Vector3, Quaternion } from 'three';
import { useRef, useEffect } from 'react';
import { ECS } from '@/ecs';
import { socket } from '@/socket';
import { CLASSES_CONFIG } from '@/classesConfig';
import { useUIStore } from '@/store';
import type { AnyAnimation } from '@game/shared';

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
  FORWARD_JUMP_FORCE: 10
};

// === 2. ГЛОБАЛЬНЫЕ ВЕКТОРЫ (Оптимизация памяти) ===
// Никаких new Vector3() внутри useFrame!
const direction = new Vector3();
const frontVector = new Vector3();
const sideVector = new Vector3();
const upVector = new Vector3(0, 1, 0);
const targetQuaternion = new Quaternion();
const tempPos = new Vector3();
const forwardDir = new Vector3(0, 0, 1); // <-- Вынесли вектор направления для прыжка

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

    // === 1. УМНОЕ ДВИЖЕНИЕ (С сохранением инерции в воздухе) ===
    direction.normalize().multiplyScalar(currentSpeed);

    if (isGrounded) {
      // НА ЗЕМЛЕ: Жесткое управление. Отпустил кнопку - сразу остановился.
      body.setLinvel({ x: direction.x, y: currentVelocity.y, z: direction.z }, true);
    } else {
      // В ВОЗДУХЕ: Сохраняем инерцию (momentum) от прыжка!
      // Даем игроку легкий "air control" (возможность чуть подруливать WASD в полете)
      const airControl = 0.05; // Насколько сильно WASD влияет в воздухе (0.05 = слабо, 0.5 = сильно)

      // Плавно смешиваем текущую скорость полета с тем, что нажимает игрок
      const newX = currentVelocity.x + (direction.x - currentVelocity.x) * airControl;
      const newZ = currentVelocity.z + (direction.z - currentVelocity.z) * airControl;

      body.setLinvel({ x: newX, y: currentVelocity.y, z: newZ }, true);
    }

    // === 2. ПРЫЖОК С ИМПУЛЬСОМ ВПЕРЕД ===
    if (keys.jump && isGrounded && !isActionLocked) {
      // ИСПОЛЬЗУЕМ ГЛОБАЛЬНЫЙ ВЕКТОР (Оптимизация: переиспользуем forwardDir)
      forwardDir.set(0, 0, 1)
        .applyQuaternion(player.threeObject.quaternion)
        .normalize();

      // Применяем импульс: толкаем вверх (JUMP_FORCE) и одновременно вперед (FORWARD_JUMP_FORCE)
      body.applyImpulse({
        x: forwardDir.x * CONFIG.FORWARD_JUMP_FORCE,
        y: CONFIG.JUMP_FORCE,
        z: forwardDir.z * CONFIG.FORWARD_JUMP_FORCE
      }, true);

      groundedFrames.current = 0;

      // === ВОТ РЕШЕНИЕ ПРОБЛЕМЫ ЗАДЕРЖКИ ===
      // Мы принудительно ставим анимацию airborne, не дожидаясь проверок физики в конце кадра!
      const classLogic = CLASSES_CONFIG[player.classType!];
      if (classLogic) {
        // Кастим as AnyAnimation, чтобы TypeScript не ругался на строгие типы
        player.currentAnimation = classLogic.locomotion.airborne as AnyAnimation;
      }
      // ===================================
    }

    const isAirborne = !isGrounded && groundedFrames.current === 0;

    // --- Д. АНИМАЦИИ ---
    if (!isActionLocked && !player.isAiming && player.classType) {
      const classLogic = CLASSES_CONFIG[player.classType];

      if (classLogic) {
        if (groundedFrames.current > 0) {
          // МЫ СТОИМ НА ЗЕМЛЕ: Включаем обычный Run или Idle
          player.currentAnimation = isMoving
            ? classLogic.locomotion.run as AnyAnimation
            : classLogic.locomotion.idle as AnyAnimation;
        } else if (isAirborne) {
          // МЫ УЖЕ ДАВНО В ВОЗДУХЕ (прошлиGROUNDED_FRAMES_MIN): Включаем кувырок по физике
          player.currentAnimation = classLogic.locomotion.airborne as AnyAnimation;
        }
      }
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