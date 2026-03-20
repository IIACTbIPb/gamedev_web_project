import * as THREE from 'three';
import React, { type JSX } from 'react';
import { useGraph } from '@react-three/fiber';
import { useGLTF, useAnimations } from '@react-three/drei';
import { SkeletonUtils } from 'three-stdlib';
import type { GLTF } from 'three-stdlib'; // 1. Исправлен импорт типа
import type { WarriorAnimation } from '@game/shared';
import { useCharacterAnimation } from '@/hooks/useCharacterAnimation';

interface GLTFAction extends THREE.AnimationClip {
  name: WarriorAnimation;
}

type GLTFResult = GLTF & {
  nodes: {
    Face: THREE.Mesh;
    ShoulderPadL: THREE.Mesh;
    Warrior_Sword: THREE.Mesh;
    ShoulderPadR: THREE.Mesh;
    Warrior_Body: THREE.SkinnedMesh;
    Root: THREE.Bone;
  };
  materials: {
    Warrior_Texture: THREE.MeshBasicMaterial;
    Warrior_Sword_Texture: THREE.MeshBasicMaterial;
  };
  animations: GLTFAction[];
};

type WarriorProps = Omit<JSX.IntrinsicElements['group'], 'id'> & { id: string };

export function Warrior({ id, ...props }: WarriorProps) {
  const group = React.useRef<THREE.Group>(null);
  const { scene, animations } = useGLTF('/Warrior.gltf');
  const clone = React.useMemo(() => SkeletonUtils.clone(scene), [scene]);
  const { nodes, materials } = useGraph(clone) as unknown as GLTFResult;
  const { actions } = useAnimations(animations, group);

  useCharacterAnimation(id, 'Warrior', actions);

  return (
    <group ref={group} {...props} dispose={null}>
      <group name="Scene">
        <group name="CharacterArmature">
          <primitive object={nodes.Root} />
          <skinnedMesh
            name="Warrior_Body"
            geometry={nodes.Warrior_Body.geometry}
            material={materials.Warrior_Texture}
            skeleton={nodes.Warrior_Body.skeleton}
            // Включаем отбрасывание теней для красоты
            castShadow
            receiveShadow
          />
        </group>
      </group>
    </group>
  );
}

useGLTF.preload('/Warrior.gltf');
