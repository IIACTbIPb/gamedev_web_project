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
import { world } from './ecs';
import { CameraFollowSystem } from './systems/CameraFollowSystem';
import { ProjectileSystem } from './systems/ProjectileSystem';
import { Projectiles } from './components/Projectiles';
import { Crosshair, MainMenu } from './components/ui';

// Создаем конфиг управления (WASD + стрелочки + Пробел)
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
      world.add(arrowData); // Добавляем чужую стрелу в наш мир
    });

    socket.on('playerMoved', ({ id, position, rotation, animation, isAiming }) => {
      const entity = world.where((e) => e.id === id).first;

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
      // Ищем эту стрелу в мире клона
      const arrow = world.where((e) => e.id === arrowId).first;

      if (arrow && arrow.position && arrow.velocity) {
        // Жестко примагничиваем стрелу к правильной точке и обнуляем скорость!
        arrow.position.x = position.x;
        arrow.position.y = position.y;
        arrow.position.z = position.z;
        arrow.velocity.x = 0;
        arrow.velocity.y = 0;
        arrow.velocity.z = 0;
        arrow.lifeTime = 3; // Укорачиваем жизнь застрявшей стрелы
      }
    });

    return () => {
      socket.off('gameState');
      socket.off('playerMoved');
      socket.off('playerShot');
      socket.off('arrowHit');
    };
  }, []);

  const handleJoin = (selectedClass: CharacterClass) => {
    socket.emit('joinGame', selectedClass); // Отправляем серверу наш выбор
    setIsJoined(true); // Скрываем меню
  };

  return (
    <div className={styles.gameContainer}>
      {/* === HTML-ИНТЕРФЕЙС ПОВЕРХ ИГРЫ === */}
      {!isJoined && <MainMenu onSelectClass={handleJoin} />}
      <Crosshair />
      {/* Оборачиваем Canvas в контроллер клавиатуры */}
      <KeyboardControls map={keyboardMap}>
        <Canvas camera={{ position: [0, 8, 15] }}>
          <color attach="background" args={['#020208']} />
          {/* 2. Звездное небо из Drei */}
          <Stars
            radius={100} // Радиус сферы со звездами
            depth={50} // Глубина
            count={5000} // Количество звезд
            factor={4} // Размер звезд
            saturation={0}
            fade
            speed={1} // Скорость мерцания
          />

          {/* 3. Луна (светящаяся сфера далеко в небе) */}
          <mesh position={[30, 40, -40]}>
            <sphereGeometry args={[4, 32, 32]} />
            <meshBasicMaterial color="#fffacd" /> {/* Бледно-желтый светящийся цвет */}
          </mesh>

          {/* 4. Освещение (Лунный свет) */}
          {/* Направленный свет, бьющий прямо из координат Луны */}
          <directionalLight
            position={[30, 40, -40]}
            intensity={1.5}
            color="#b8c6db" /* Синеватый лунный оттенок */
            castShadow
            shadow-mapSize={[2048, 2048]}
          />

          <ambientLight intensity={0.15} color="#404050" />

          <Physics debug>
            <Ground />

            {/* Наша новая система движения */}
            <MovementSystem />
            {/* Наша новая система следования камеры */}
            <CameraFollowSystem />
            {/* Наша новая система стрельбы */}
            <ProjectileSystem />
            <Projectiles />

            {Object.values(players).map((player) => (
              <Player
                key={player.id}
                id={player.id}
                position={[player.position.x, player.position.y, player.position.z]}
                isMe={player.id === socket.id}
                classType={player.classType}
              />
            ))}
          </Physics>

          <OrbitControls
            makeDefault // Обязательно! Делает контроллер доступным глобально
            enablePan={false} // Отключаем перемещение камеры (мы идем за игроком)
            mouseButtons={{
              LEFT: THREE.MOUSE.ROTATE,
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
