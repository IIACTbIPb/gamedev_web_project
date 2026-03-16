import { useEffect, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, KeyboardControls, Stars } from '@react-three/drei';
import * as THREE from 'three';
import { Physics } from '@react-three/rapier';
import type { CharacterClass, GameState } from '@game/shared';

import { Player } from './components/Player';
import { Ground } from './components/Ground';
import { MovementSystem } from './systems/MovementSystem';
import styles from './App.module.css';
import { socket } from './socket';
import { ECS } from './ecs'; // <-- Используем обновленные импорты
import { CameraFollowSystem } from './systems/CameraFollowSystem';
import { ProjectileSystem } from './systems/ProjectileSystem';
import { Projectiles } from './components/Projectiles';
import { Crosshair, DeathScreen, MainMenu, PlayerHUD } from './components/ui';
import { useUIStore } from './store/uiStore';

const keyboardMap = [
  { name: 'forward', keys: ['ArrowUp', 'KeyW'] },
  { name: 'backward', keys: ['ArrowDown', 'KeyS'] },
  { name: 'left', keys: ['ArrowLeft', 'KeyA'] },
  { name: 'right', keys: ['ArrowRight', 'KeyD'] },
  { name: 'jump', keys: ['Space'] },
];

function App() {
  const [isJoined, setIsJoined] = useState(false);
  const [players, setPlayers] = useState<GameState>({});

  useEffect(() => {
    socket.on('gameState', (state: GameState) => {
      setPlayers(state);
    });

    socket.on('playerShot', (arrowData) => {
      // Спавним стрелу (пока оставляем императивно, это нормально для снарядов)
      ECS.world.add(arrowData);
    });

    socket.on('playerMoved', ({ id, position, rotation, animation, isAiming }) => {
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
      socket.off('arrowHit');
      socket.off('playerHpChanged');
      socket.off('playerDied');
      socket.off('playerRespawned');
    };
  }, []);

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
      <DeathScreen />

      <KeyboardControls map={keyboardMap}>
        <Canvas camera={{ position: [0, 8, 15] }}>
          <color attach="background" args={['#020208']} />
          <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />

          <mesh position={[30, 40, -40]}>
            <sphereGeometry args={[4, 32, 32]} />
            <meshBasicMaterial color="#fffacd" />
          </mesh>
          <directionalLight
            position={[30, 40, -40]}
            intensity={1.5}
            color="#b8c6db"
            castShadow
            shadow-mapSize={[2048, 2048]}
          />
          <ambientLight intensity={0.15} color="#404050" />

          <Physics debug={false}>
            {' '}
            {/* Можно отключить дебаг физики, если мешает */}
            <Ground />
            <MovementSystem />
            <CameraFollowSystem />
            <ProjectileSystem />
            <Projectiles />
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
