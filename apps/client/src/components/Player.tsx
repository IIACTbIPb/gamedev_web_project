import { useEffect, useRef } from 'react';
import { RigidBody, type RapierRigidBody } from '@react-three/rapier';
import type { Mesh } from 'three';
import { world } from '../ecs';

interface PlayerProps {
  id: string;
  position: [number, number, number];
  isMe: boolean;
}

export const Player = ({ id, position, isMe }: PlayerProps) => {
  const meshRef = useRef<Mesh>(null!);
  const rigidBodyRef = useRef<RapierRigidBody>(null!);

  useEffect(() => {
    if (!meshRef.current || !rigidBodyRef.current) return;

    // Добавляем сущность с ссылкой на физическое тело
    const entity = world.add({
      id,
      isMe,
      position: { x: position[0], y: position[1], z: position[2] },
      threeObject: meshRef.current,
      rigidBody: rigidBodyRef.current,
    });

    return () => {
      world.remove(entity);
    };
  }, [id, isMe, position]);

  return (
    // type="dynamic" - объект подвержен гравитации
    // colliders="cuboid" - форма столкновения (коробка)
    // position здесь задает начальную точку появления
    <RigidBody
      ref={rigidBodyRef}
      type={isMe ? 'dynamic' : 'kinematicPosition'}
      colliders="cuboid"
      position={position}
      enabledRotations={[false, false, false]}
    >
      <mesh ref={meshRef}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color={isMe ? 'hotpink' : 'mediumpurple'} />
        <mesh position={[0, 0.2, 0.51]}>
          <boxGeometry args={[0.7, 0.2, 0.1]} />
          <meshStandardMaterial color="black" />
        </mesh>
      </mesh>
    </RigidBody>
  );
};
