import { useEffect, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { Physics } from '@react-three/rapier';
import { io } from 'socket.io-client';
import type { GameState } from '@game/shared';
import { Player, Ground } from './components';
import styles from './App.module.css';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3001';
const socket = io(SOCKET_URL);

function App() {
  const [players, setPlayers] = useState<GameState>({});

  useEffect(() => {
    socket.on('gameState', (state: GameState) => {
      setPlayers(state);
    });
    return () => {
      socket.off('gameState');
    };
  }, []);

  return (
    <div className={styles.gameContainer}>
      <Canvas camera={{ position: [0, 8, 15] }}>
        <ambientLight intensity={0.5} />
        <directionalLight position={[10, 10, 10]} intensity={1} castShadow />

        {/* Включаем физику. debug покажет зеленые линии коллизий (удобно для разработки) */}
        <Physics debug>
          <Ground />

          {Object.values(players).map((player) => (
            <Player
              key={player.id}
              id={player.id}
              // Спавним игроков чуть выше, чтобы они эффектно падали на землю
              position={[player.position.x, 5, player.position.z]}
              isMe={player.id === socket.id}
            />
          ))}
        </Physics>

        <OrbitControls />
      </Canvas>
    </div>
  );
}

export default App;
