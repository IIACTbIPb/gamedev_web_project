import { useEffect, useState, type JSX } from 'react';
import { RigidBody, type RapierRigidBody, CapsuleCollider } from '@react-three/rapier';
import type { Group } from 'three';
import { ECS } from '@/ecs';
import type { CharacterClass } from '@game/shared';
import { useUIStore } from '@/store/uiStore';
import { Ranger } from './Ranger';
import { Rogue } from './Rogue';
import { Warrior } from './Warrior';

interface PlayerProps {
  id: string;
  position: [number, number, number];
  isMe: boolean;
  classType?: CharacterClass;
  hp: number;
  maxHp: number;
  name?: string;
}

type ModelProps = Omit<JSX.IntrinsicElements['group'], 'id'> & {
  id: string;
};

const CLASS_MODELS: Record<CharacterClass, React.ComponentType<ModelProps>> = {
  Warrior: Warrior,
  Ranger: Ranger,
  Rogue: Rogue,
};

export const Player = ({ id, position, isMe, classType = 'Warrior', hp, maxHp, name }: PlayerProps) => {
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
      {name && <ECS.Component name="name" data={name} />}

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
          <CharacterModel id={id} scale={1} />
        </group>
      </RigidBody>
    </ECS.Entity>
  );
};
