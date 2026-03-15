import { useEffect, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, KeyboardControls } from '@react-three/drei';
import * as THREE from 'three';
import { Physics } from '@react-three/rapier';
import type { GameState } from '@game/shared';

import { Player } from './components/Player';
import { Ground } from './components/Ground';
import { MovementSystem } from './systems/MovementSystem';
import styles from './App.module.css';
import { socket } from './socket';
import { world } from './ecs';
import { CameraFollowSystem } from './systems/CameraFollowSystem';

// Создаем конфиг управления (WASD + стрелочки + Пробел)
const keyboardMap = [
  { name: 'forward', keys: ['ArrowUp', 'KeyW'] },
  { name: 'backward', keys: ['ArrowDown', 'KeyS'] },
  { name: 'left', keys: ['ArrowLeft', 'KeyA'] },
  { name: 'right', keys: ['ArrowRight', 'KeyD'] },
  { name: 'jump', keys: ['Space'] },
];

function App() {
  const [players, setPlayers] = useState<GameState>({});

  useEffect(() => {
    socket.on('gameState', (state: GameState) => {
      setPlayers(state);
    });

    socket.on('playerMoved', ({ id, position, rotation }) => {
      const entity = world.where((e) => e.id === id).first;

      if (entity && entity.rigidBody && !entity.isMe) {
        // Двигаем физическое тело
        entity.rigidBody.setNextKinematicTranslation(position);

        // Вращаем визуальную модель
        if (entity.threeObject && rotation) {
          entity.threeObject.quaternion.set(rotation[0], rotation[1], rotation[2], rotation[3]);
        }
      }
    });

    return () => {
      socket.off('gameState');
      socket.off('playerMoved');
    };
  }, []);

  return (
    <div className={styles.gameContainer}>
      {/* Оборачиваем Canvas в контроллер клавиатуры */}
      <KeyboardControls map={keyboardMap}>
        <Canvas camera={{ position: [0, 8, 15] }}>
          <ambientLight intensity={0.5} />
          <directionalLight position={[10, 10, 10]} intensity={1} castShadow />

          <Physics debug>
            <Ground />

            {/* Наша новая система движения */}
            <MovementSystem />
            {/* Наша новая система следования камеры */}
            <CameraFollowSystem />

            {Object.values(players).map((player) => (
              <Player
                key={player.id}
                id={player.id}
                position={[player.position.x, 5, player.position.z]}
                isMe={player.id === socket.id}
              />
            ))}
          </Physics>

          <OrbitControls
            makeDefault // Обязательно! Делает контроллер доступным глобально
            enablePan={false} // Отключаем перемещение камеры (мы идем за игроком)
            mouseButtons={{
              LEFT: THREE.MOUSE.PAN, // Левая кнопка свободна для будущей стрельбы/атаки
              MIDDLE: THREE.MOUSE.DOLLY, // Колесико приближает/отдаляет
              RIGHT: THREE.MOUSE.ROTATE, // Правая кнопка вращает камеру вокруг куба!
            }}
          />
        </Canvas>
      </KeyboardControls>
    </div>
  );
}

export default App;
