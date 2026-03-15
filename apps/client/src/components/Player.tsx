import { useEffect, useRef, type JSX } from 'react';
import { RigidBody, type RapierRigidBody, CapsuleCollider } from '@react-three/rapier';
import type { Group } from 'three'; // <-- Меняем Mesh на Group
import { world } from '../ecs';
import { Warrior } from './Warrior'; // <-- Импортируем нашего Воина!
import { Ranger } from './Ranger';
import type { CharacterClass } from '@game/shared';

interface PlayerProps {
  id: string;
  position: [number, number, number];
  isMe: boolean;
  classType?: CharacterClass;
}

type ModelProps = Omit<JSX.IntrinsicElements['group'], 'id'> & {
  id: string;
};

const CLASS_MODELS: Record<CharacterClass, React.ComponentType<ModelProps>> = {
  Warrior: Warrior,
  Ranger: Ranger,
};

export const Player = ({ id, position, isMe, classType = 'Warrior' }: PlayerProps) => {
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
      classType: classType,
    });

    return () => {
      world.remove(entity);
    };
  }, [classType, id, isMe, position]);

  const CharacterModel = CLASS_MODELS[classType] || CLASS_MODELS.Warrior;

  return (
    <RigidBody
      ref={rigidBodyRef}
      type={isMe ? 'dynamic' : 'kinematicPosition'}
      colliders={false}
      position={position}
      enabledRotations={[false, false, false]}
    >
      {/* Рисуем свой ручной коллайдер. 
          args={[половина_высоты_цилиндра, радиус]} 
          position={[x, y, z]} - поднимаем его чуть вверх, чтобы он не проваливался под землю 
      */}
      <CapsuleCollider args={[1, 0.5]} position={[0, 1.5, 0]} />
      {/* Оборачиваем Character в group, чтобы наша ECS система могла его крутить */}
      <group ref={groupRef}>
        <CharacterModel id={id} scale={1} />
      </group>
    </RigidBody>
  );
};
