import { useMemo, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, KeyboardControls, Stars, Environment } from '@react-three/drei';
import * as THREE from 'three';
import { Physics } from '@react-three/rapier';
import { Perf } from 'r3f-perf';
import type { CharacterClass } from '@game/shared';

import styles from './App.module.css';
import { socket } from '@/socket';
import { ProjectileSystem, CameraFollowSystem, MovementSystem } from '@/systems';
import {
  Crosshair,
  DeathScreen,
  LoadingScreen,
  MainMenu,
  PlayerHUD,
  SettingsMenu,
  SkillBar,
} from '@/components/ui';
import { useUIStore } from '@/store/uiStore';
import { PathfinderNPC } from '@/components/entities/npcs';
import { useSettingsStore } from '@/store';
import { Effects } from '@/components/effects';
import { DamageNumbersManager, NameplatesManager } from '@/components/world-ui';
import { Forest, Ground, Village, WarriorStatue } from '@/components/environment';
import { Projectiles } from '@/components/entities/projectiles';
import { PlayerManager } from '@/components/entities/characters';
import { useGameSockets } from './hooks/useGameSockets';

function App() {
  const [isJoined, setIsJoined] = useState(false);
  const { isNight, keybinds } = useSettingsStore();

  // Подключаем наши игровые сокеты
  useGameSockets();

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

  const bgColor = isNight ? '#020208' : '#87CEEB';
  const ambientLightIntensity = isNight ? 0.15 : 0.8;
  const directionalLightIntensity = isNight ? 1.5 : 2.5;

  const handleJoin = (selectedClass: CharacterClass, playerName: string) => {
    socket.emit('joinGame', { classType: selectedClass, name: playerName });
    useUIStore.getState().setClassType(selectedClass);
    setIsJoined(true);
  };

  return (
    <div className={styles.gameContainer}>
      <LoadingScreen />
      {!isJoined && <MainMenu onSelectClass={handleJoin} />}
      <Crosshair />
      {isJoined && <PlayerHUD />}
      {isJoined && <SkillBar />}
      <DeathScreen />
      <SettingsMenu />

      <KeyboardControls map={keyboardMap}>
        <Canvas camera={{ position: [0, 8, 15] }} dpr={[1, 2]}>
          <color attach="background" args={[bgColor]} />
          <Perf position="top-right" />

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

          {/* ВЫКЛЮЧИЛИ DEBUG ФИЗИКИ */}
          <Physics debug={false}>
            <Ground />
            <Forest />
            <WarriorStatue position={[-23, 2, -25]} scale={2} rotation={[0, 0.5, 0]} />
            <Village />
            <PathfinderNPC position={[-15, 0, 5]} rotation={[0, -5, 0]} />

            <MovementSystem />
            <CameraFollowSystem />
            <ProjectileSystem />
            <Projectiles />
            <Effects />

            {/* Рендеринг игроков теперь изолирован! */}
            <PlayerManager />
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
          <NameplatesManager />
          <DamageNumbersManager />
        </Canvas>
      </KeyboardControls>
    </div>
  );
}

export default App;