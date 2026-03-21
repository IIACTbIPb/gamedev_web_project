import { socket } from "@/socket";
import { useEffect, useState } from "react";
import { Player } from "./Player";
import type { GameState } from "@game/shared";

export const PlayerManager = () => {
  const [players, setPlayers] = useState<GameState>({});

  useEffect(() => {
    socket.on('gameState', setPlayers);
    return () => { socket.off('gameState', setPlayers); };
  }, []);

  return (
    <>
      {Object.values(players).map((player) => (
        <Player
          key={player.id}
          id={player.id}
          position={[player.position.x, player.position.y, player.position.z]}
          isMe={player.id === socket.id}
          classType={player.classType}
          hp={player.hp}
          maxHp={player.maxHp}
          name={player.name}
        />
      ))}
    </>
  );
};