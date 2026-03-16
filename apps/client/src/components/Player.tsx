import { useEffect, useState, type JSX } from 'react';
import { RigidBody, type RapierRigidBody, CapsuleCollider } from '@react-three/rapier';
import type { Group } from 'three';
import { ECS } from '../ecs';
import { Warrior } from './Warrior';
import { Ranger } from './Ranger';
import type { CharacterClass } from '@game/shared';
import { HpBar } from './ui'; // Убедись, что путь импорта верный
import { useUIStore } from '../store/uiStore';

interface PlayerProps {
  id: string;
  position: [number, number, number];
  isMe: boolean;
  classType?: CharacterClass;
  hp: number;
  maxHp: number;
}

type ModelProps = Omit<JSX.IntrinsicElements['group'], 'id'> & {
  id: string;
};

const CLASS_MODELS: Record<CharacterClass, React.ComponentType<ModelProps>> = {
  Warrior: Warrior,
  Ranger: Ranger,
};

export const Player = ({ id, position, isMe, classType = 'Warrior', hp, maxHp }: PlayerProps) => {
  const [threeObject, setThreeObject] = useState<Group | null>(null);
  const [rigidBody, setRigidBody] = useState<RapierRigidBody | null>(null);

  const CharacterModel = CLASS_MODELS[classType] || CLASS_MODELS.Warrior;

  useEffect(() => {
    return () => {
      if (!isMe) {
        useUIStore.getState().removePlayerHp(id);
      }
    };
  }, [id, isMe]);

  return (
    <ECS.Entity>
      <ECS.Component name="id" data={id} />
      <ECS.Component name="isMe" data={isMe} />
      <ECS.Component name="position" data={{ x: position[0], y: position[1], z: position[2] }} />
      <ECS.Component name="currentAnimation" data="Idle" />
      <ECS.Component name="classType" data={classType} />
      <ECS.Component name="hp" data={hp} />
      <ECS.Component name="maxHp" data={maxHp} />

      {/* Добавляем ссылки на Three.js и Rapier только после их инициализации */}
      {threeObject && <ECS.Component name="threeObject" data={threeObject} />}
      {rigidBody && <ECS.Component name="rigidBody" data={rigidBody} />}

      <RigidBody
        ref={setRigidBody}
        type={isMe ? 'dynamic' : 'kinematicPosition'}
        colliders={false}
        position={position}
        enabledRotations={[false, false, false]}
      >
        <CapsuleCollider args={[1, 0.5]} position={[0, 1.5, 0]} />

        <group ref={setThreeObject}>
          {/* Показываем 3D полоску ХП только над чужими клонами (ведь свой ХП мы видим в HUD) */}
          {!isMe && <HpBar playerId={id} />}
          <CharacterModel id={id} scale={1} />
        </group>
      </RigidBody>
    </ECS.Entity>
  );
};
