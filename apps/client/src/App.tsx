import { useEffect, useMemo, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, KeyboardControls, Stars, Environment } from '@react-three/drei';
import * as THREE from 'three';
import { Physics } from '@react-three/rapier';
import type { CharacterClass, GameState } from '@game/shared';

import { Player } from './components/characters';
import styles from './App.module.css';
import { socket } from './socket';
import { ECS } from './ecs';
import { ProjectileSystem, CameraFollowSystem, MovementSystem } from './systems';
import {
  Crosshair,
  DeathScreen,
  MainMenu,
  PlayerHUD,
  SettingsMenu,
  SkillBar,
} from './components/ui';
import { useUIStore } from './store/uiStore';
import { WarriorStatue } from './components/props';
import { Projectiles, Ground } from './components/word';
import { PathfinderNPC } from './components/npcs';
import { useSettingsStore } from './store';
import { Effects } from './components/effects';


function App() {
  const [isJoined, setIsJoined] = useState(false);
  const [players, setPlayers] = useState<GameState>({});
  const { isNight, keybinds } = useSettingsStore();

  useEffect(() => {
    socket.on('gameState', (state: GameState) => {
      setPlayers(state);
    });

    socket.on('playerShot', (arrowData) => {
      // Спавним стрелу (пока оставляем императивно, это нормально для снарядов)
      ECS.world.add(arrowData);
    });

    socket.on('effectSpawned', (effectData) => {
      // Когда кто-то спавнит эффект — добавляем его в ECS для рендера
      ECS.world.add(effectData);
    });

    socket.on('playerMoved', ({ id, position, rotation, animation, isAiming, isInvisible, isSprinting }) => {
      const entity = ECS.world.where((e) => e.id === id).first;

      if (entity && entity.rigidBody && !entity.isMe) {
        entity.rigidBody.setNextKinematicTranslation(position);

        if (entity.threeObject && rotation) {
          entity.threeObject.quaternion.set(rotation[0], rotation[1], rotation[2], rotation[3]);
        }
        if (animation) {
          entity.currentAnimation = animation;
        }
        if (isAiming !== undefined) {
          entity.isAiming = isAiming;
        }
        if (isInvisible !== undefined) {
          entity.isInvisible = isInvisible;
        }
        if (isSprinting !== undefined) {
          entity.isSprinting = isSprinting;
        }
      }
    });

    socket.on('arrowHit', ({ arrowId, position }) => {
      const arrow = ECS.world.where((e) => e.id === arrowId).first;

      if (arrow && arrow.position && arrow.velocity) {
        arrow.position.x = position.x;
        arrow.position.y = position.y;
        arrow.position.z = position.z;
        arrow.velocity.x = 0;
        arrow.velocity.y = 0;
        arrow.velocity.z = 0;
        arrow.lifeTime = 3;
      }
    });

    socket.on('playerHpChanged', ({ id, hp, maxHp }) => {
      const entity = ECS.world.where((e) => e.id === id).first;
      if (entity) {
        // Прямое обновление ECS (React об этом не знает, и это хорошо для оптимизации)
        ECS.world.update(entity, { hp, maxHp });

        // Дергаем интерфейс только если это мы
        if (entity.isMe) {
          useUIStore.getState().setHp(hp, maxHp);
        } else {
          useUIStore.getState().setPlayerHp(id, hp, maxHp);
        }
      }
    });

    socket.on('playerDied', ({ victimId, killerId }) => {
      const entity = ECS.world.where((e) => e.id === victimId).first;
      if (entity) {
        ECS.world.update(entity, { currentAnimation: 'Death' });

        if (entity.isMe) {
          useUIStore.getState().setDeathState(true, killerId);
        }
      }
    });

    socket.on('playerRespawned', ({ id, position }) => {
      const entity = ECS.world.where((e) => e.id === id).first;

      if (entity) {
        ECS.world.update(entity, { currentAnimation: 'Idle' });

        if (entity.isMe && entity.rigidBody) {
          entity.rigidBody.setTranslation(position, true);
          entity.rigidBody.setLinvel({ x: 0, y: 0, z: 0 }, true); // Гасим инерцию падения
        }
      }
    });

    return () => {
      socket.off('gameState');
      socket.off('playerMoved');
      socket.off('playerShot');
      socket.off('effectSpawned');
      socket.off('arrowHit');
      socket.off('playerHpChanged');
      socket.off('playerDied');
      socket.off('playerRespawned');
    };
  }, []);

  const keyboardMap = useMemo(
    () => [
      { name: 'forward', keys: keybinds.forward || ['ArrowUp', 'KeyW'] },
      { name: 'backward', keys: keybinds.backward || ['ArrowDown', 'KeyS'] },
      { name: 'left', keys: keybinds.left || ['ArrowLeft', 'KeyA'] },
      { name: 'right', keys: keybinds.right || ['ArrowRight', 'KeyD'] },
      { name: 'jump', keys: keybinds.jump || ['Space'] },
      { name: 'skill1', keys: keybinds.skill1 || ['KeyE'] },
      { name: 'skill2', keys: keybinds.skill2 || ['KeyR'] },
    ],
    [keybinds],
  );

  // Настройки освещения и цвета в зависимости от времени суток
  const bgColor = isNight ? '#020208' : '#87CEEB'; // Космос или Голубое небо
  const ambientLightIntensity = isNight ? 0.15 : 0.8;
  const directionalLightIntensity = isNight ? 1.5 : 2.5;

  const handleJoin = (selectedClass: CharacterClass) => {
    socket.emit('joinGame', selectedClass);
    useUIStore.getState().setClassType(selectedClass);
    setIsJoined(true);
  };

  return (
    <div className={styles.gameContainer}>
      {!isJoined && <MainMenu onSelectClass={handleJoin} />}
      <Crosshair />
      {isJoined && <PlayerHUD />}
      {isJoined && <SkillBar />}
      <DeathScreen />
      <SettingsMenu />

      <KeyboardControls map={keyboardMap}>
        <Canvas camera={{ position: [0, 8, 15] }}>
          <color attach="background" args={[bgColor]} />
          {isNight && <Stars radius={100} depth={50} count={5000} factor={4} fade />}

          <mesh position={[30, 40, -40]}>
            <sphereGeometry args={[4, 32, 32]} />
            <meshBasicMaterial color="#fffacd" />
          </mesh>
          <directionalLight
            position={[30, 40, -40]}
            intensity={directionalLightIntensity}
            color={isNight ? '#b8c6db' : '#ffffff'}
            castShadow
            shadow-mapSize={[2048, 2048]}
          />
          <ambientLight intensity={ambientLightIntensity} color={isNight ? '#404050' : '#ffffff'} />
          <Environment preset="city" environmentIntensity={0.3} />

          <Physics debug={false}>
            {/* Можно отключить дебаг физики, если мешает */}
            <Ground />
            {/* Статуя где-то вдалеке */}
            <WarriorStatue position={[0, 2, -15]} scale={2} />
            {/* NPCs */}
            <PathfinderNPC position={[-35, 0, 5]} rotation={[0, 6, 0]} />
            {/* Системы */}
            <MovementSystem />
            <CameraFollowSystem />
            <ProjectileSystem />
            <Projectiles />
            <Effects />
            {/* Рендерим игроков */}
            {Object.values(players).map((player) => (
              <Player
                key={player.id}
                id={player.id}
                position={[player.position.x, player.position.y, player.position.z]}
                isMe={player.id === socket.id}
                classType={player.classType}
                hp={player.hp}
                maxHp={player.maxHp}
              />
            ))}
          </Physics>
          <OrbitControls
            makeDefault
            enablePan={false}
            mouseButtons={{
              LEFT: THREE.MOUSE.ROTATE,
              MIDDLE: THREE.MOUSE.DOLLY,
              RIGHT: THREE.MOUSE.ROTATE,
            }}
          />
        </Canvas>
      </KeyboardControls>
    </div>
  );
}

export default App;
