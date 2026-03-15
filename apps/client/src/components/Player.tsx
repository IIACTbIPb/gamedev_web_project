import { useEffect, useRef } from 'react';
import { RigidBody, type RapierRigidBody } from '@react-three/rapier';
import type { Group } from 'three'; // <-- Меняем Mesh на Group
import { world } from '../ecs';
import { Warrior } from './Warrior'; // <-- Импортируем нашего Воина!

interface PlayerProps {
  id: string;
  position: [number, number, number];
  isMe: boolean;
}

export const Player = ({ id, position, isMe }: PlayerProps) => {
  // Теперь это ссылка на группу (контейнер для модели)
  const groupRef = useRef<Group>(null!);
  const rigidBodyRef = useRef<RapierRigidBody>(null!);

  useEffect(() => {
    if (!groupRef.current || !rigidBodyRef.current) return;

    const entity = world.add({
      id,
      isMe,
      position: { x: position[0], y: position[1], z: position[2] },
      threeObject: groupRef.current,
      rigidBody: rigidBodyRef.current,
      currentAnimation: 'Idle',
    });

    return () => {
      world.remove(entity);
    };
  }, [id, isMe, position]);

  return (
    <RigidBody
      ref={rigidBodyRef}
      type={isMe ? 'dynamic' : 'kinematicPosition'}
      // Rapier автоматически вычислит размер физической коробки вокруг модели Воина!
      colliders="cuboid"
      position={position}
      enabledRotations={[false, false, false]}
    >
      {/* Оборачиваем Воина в group, чтобы наша ECS система могла его крутить */}
      <group ref={groupRef}>
        {/* Масштабируем модель, если она окажется слишком большой или маленькой */}
        <Warrior id={id} scale={1} />
      </group>
    </RigidBody>
  );
};
