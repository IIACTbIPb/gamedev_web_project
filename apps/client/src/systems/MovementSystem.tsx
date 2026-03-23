import { useFrame, useThree } from '@react-three/fiber';
import { useKeyboardControls } from '@react-three/drei';
import { Vector3, Quaternion } from 'three';
import { useRef, useEffect } from 'react';
import { ECS } from '@/ecs';
import { socket } from '@/socket';
import { CLASSES_CONFIG } from '@/classesConfig';
import { useUIStore } from '@/store';
import { CLASS_BALANCE, type AnyAnimation } from '@game/shared';

// === 1. ГЕЙМПЛЕЙНЫЕ КОНСТАНТЫ ===
const CONFIG = {
  JUMP_FORCE: 8,
  ROTATION_SPEED_MOVING: 15,
  ROTATION_SPEED_AIMING: 20,
  GROUNDED_Y_VEL_THRESHOLD: 0.05,
  GROUNDED_FRAMES_MIN: 3,
  NETWORK_SYNC_POS_TOLERANCE: 0.05,
  NETWORK_SYNC_ROT_TOLERANCE: 0.05,
  FORWARD_JUMP_FORCE: 10,
  NETWORK_TICK_RATE: 0.05,
};

// === 2. ПЕРЕИСПОЛЬЗУЕМЫЕ ОБЪЕКТЫ (GC Optimization) ===
const V_DIR = new Vector3();
const V_FRONT = new Vector3();
const V_SIDE = new Vector3();
const V_UP = new Vector3(0, 1, 0);
const Q_TARGET = new Quaternion();
const V_TEMP_POS = new Vector3();
const V_FORWARD_DIR = new Vector3(0, 0, 1);

const localPlayers = ECS.world
  .with('rigidBody', 'isMe', 'threeObject')
  .where((e) => e.isMe === true);

export type Controls = 'forward' | 'backward' | 'left' | 'right' | 'jump' | 'skill1' | 'skill2';

export const MovementSystem = () => {
  const [, get] = useKeyboardControls<Controls>();
  const { camera, gl } = useThree();
  const groundedFrames = useRef(0);

  // === ОБРАБОТКА МЫШИ (Атаки) ===
  useEffect(() => {
    const canvas = gl.domElement;

    const handleMouseAction = (e: MouseEvent, isDown: boolean) => {
      if (e.button !== 0) return; // Только левая кнопка

      const player = localPlayers.first;
      if (!player || !player.classType || (player.hp !== undefined && player.hp <= 0)) return;

      const isActionLocked = player.actionTimer !== undefined && player.actionTimer > 0;
      if (isDown && isActionLocked && !player.isAiming) return;

      const classLogic = CLASSES_CONFIG[player.classType];
      if (isDown) {
        classLogic?.onPrimaryAttackStart(player);
      } else {
        classLogic?.onPrimaryAttackRelease?.(player, camera);
      }
    };

    const onDown = (e: MouseEvent) => handleMouseAction(e, true);
    const onUp = (e: MouseEvent) => handleMouseAction(e, false);

    // Нажатие слушаем ТОЛЬКО на холсте (защита от кликов по UI)
    canvas.addEventListener('mousedown', onDown);
    // Отпускание слушаем на window (гарантия срабатывания, если мышь ушла с холста)
    window.addEventListener('mouseup', onUp);

    return () => {
      canvas.removeEventListener('mousedown', onDown);
      window.removeEventListener('mouseup', onUp);
    };
  }, [camera, gl]);

  const lastSync = useRef({
    position: new Vector3(),
    rotation: new Quaternion(),
    animation: 'Idle' as AnyAnimation,
    isAiming: false,
    isInvisible: false,
    isSprinting: false,
  });

  useFrame((state, delta) => {
    const player = localPlayers.first;
    if (!player || !player.rigidBody || !player.threeObject || !player.classType) return;

    const body = player.rigidBody;
    const balance = CLASS_BALANCE[player.classType];

    // --- А. ОБНОВЛЕНИЕ ТАЙМЕРОВ (State Logic) ---
    let isActionLocked = false;
    if (player.actionTimer !== undefined && player.actionTimer > 0) {
      player.actionTimer -= delta;
      isActionLocked = true;
    }

    let currentSpeed = balance.baseSpeed;
    let isSprinting = false;

    if (player.speedBuffTimer !== undefined && player.speedBuffTimer > 0) {
      player.speedBuffTimer -= delta;
      currentSpeed = player.speed || balance.baseSpeed;
      isSprinting = true;
    } else {
      player.speedBuffTimer = 0;
      player.speed = balance.baseSpeed;
    }

    if (isActionLocked) currentSpeed = 0;

    // --- Б. ОБРАБОТКА СКИЛЛОВ ---
    const keys = get();
    if (!isActionLocked) {
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

    // --- В. ФИЗИКА ---
    const currentVelocity = body.linvel();
    const isGroundedVelocity = Math.abs(currentVelocity.y) < CONFIG.GROUNDED_Y_VEL_THRESHOLD;
    groundedFrames.current = isGroundedVelocity ? groundedFrames.current + 1 : 0;
    const isGrounded = groundedFrames.current > CONFIG.GROUNDED_FRAMES_MIN;

    state.camera.getWorldDirection(V_FRONT);
    V_FRONT.y = 0;
    V_FRONT.normalize();
    V_SIDE.copy(V_FRONT).cross(state.camera.up).normalize();

    V_DIR.set(0, 0, 0);
    if (keys.forward) V_DIR.add(V_FRONT);
    if (keys.backward) V_DIR.sub(V_FRONT);
    if (keys.right) V_DIR.add(V_SIDE);
    if (keys.left) V_DIR.sub(V_SIDE);

    const isMoving = V_DIR.lengthSq() > 0;

    if (player.isAiming) {
      const targetAngle = Math.atan2(V_FRONT.x, V_FRONT.z);
      Q_TARGET.setFromAxisAngle(V_UP, targetAngle);
      player.threeObject.quaternion.slerp(Q_TARGET, delta * CONFIG.ROTATION_SPEED_AIMING);
    } else if (isMoving && !isActionLocked) {
      const targetAngle = Math.atan2(V_DIR.x, V_DIR.z);
      Q_TARGET.setFromAxisAngle(V_UP, targetAngle);
      player.threeObject.quaternion.slerp(Q_TARGET, delta * CONFIG.ROTATION_SPEED_MOVING);
    }

    V_DIR.normalize().multiplyScalar(currentSpeed);

    if (isGrounded) {
      body.setLinvel({ x: V_DIR.x, y: currentVelocity.y, z: V_DIR.z }, true);
    } else {
      const airControl = 0.05;
      body.setLinvel({
        x: currentVelocity.x + (V_DIR.x - currentVelocity.x) * airControl,
        y: currentVelocity.y,
        z: currentVelocity.z + (V_DIR.z - currentVelocity.z) * airControl
      }, true);
    }

    if (keys.jump && isGrounded && !isActionLocked) {
      V_FORWARD_DIR.set(0, 0, 1).applyQuaternion(player.threeObject.quaternion).normalize();
      body.applyImpulse({
        x: V_FORWARD_DIR.x * CONFIG.FORWARD_JUMP_FORCE,
        y: CONFIG.JUMP_FORCE,
        z: V_FORWARD_DIR.z * CONFIG.FORWARD_JUMP_FORCE
      }, true);
      groundedFrames.current = 0;
    }

    // --- Г. АНИМАЦИИ ---
    if (!isActionLocked && !player.isAiming) {
      const classLogic = CLASSES_CONFIG[player.classType];
      if (classLogic) {
        if (isGrounded) {
          player.currentAnimation = isMoving
            ? classLogic.locomotion.run as AnyAnimation
            : classLogic.locomotion.idle as AnyAnimation;
        } else {
          player.currentAnimation = classLogic.locomotion.airborne as AnyAnimation;
        }
      }
    }

    // --- Д. СЕТЬ ---
    if (player.lastNetworkTick === undefined) player.lastNetworkTick = 0;
    player.lastNetworkTick += delta;

    if (player.lastNetworkTick >= CONFIG.NETWORK_TICK_RATE) {
      const currentPos = body.translation();
      const currentRot = player.threeObject.quaternion;
      const currentAnim = player.currentAnimation || 'Idle';

      V_TEMP_POS.set(currentPos.x, currentPos.y, currentPos.z);
      const sync = lastSync.current;

      const posChanged = sync.position.distanceToSquared(V_TEMP_POS) > CONFIG.NETWORK_SYNC_POS_TOLERANCE;
      const rotChanged = sync.rotation.angleTo(currentRot) > CONFIG.NETWORK_SYNC_ROT_TOLERANCE;
      const stateChanged = currentAnim !== sync.animation ||
        !!player.isAiming !== sync.isAiming ||
        !!player.isInvisible !== sync.isInvisible ||
        isSprinting !== sync.isSprinting;

      if (posChanged || rotChanged || stateChanged) {
        socket.emit('move', {
          position: currentPos,
          rotation: [currentRot.x, currentRot.y, currentRot.z, currentRot.w],
          animation: currentAnim,
          isAiming: !!player.isAiming,
          isInvisible: !!player.isInvisible,
          isSprinting: isSprinting,
        });

        sync.position.copy(V_TEMP_POS);
        sync.rotation.copy(currentRot);
        sync.animation = currentAnim;
        sync.isAiming = !!player.isAiming;
        sync.isInvisible = !!player.isInvisible;
        sync.isSprinting = isSprinting;
      }
      player.lastNetworkTick = 0;
    }
  });

  return null;
};