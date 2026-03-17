import * as THREE from 'three';
import React, { type JSX } from 'react';
import { useGraph } from '@react-three/fiber';
import { useGLTF, useAnimations } from '@react-three/drei';
import { type GLTF, SkeletonUtils } from 'three-stdlib';
import { useCharacterAnimation } from '../../hooks/useCharacterAnimation';
import type { RogueAnimation } from '@game/shared';

interface GLTFAction extends THREE.AnimationClip {
  name: RogueAnimation;
}

type GLTFResult = GLTF & {
  nodes: {
    ShoelaceL: THREE.Mesh;
    Face: THREE.Mesh;
    Guard: THREE.Mesh;
    Rogue_Dagger: THREE.Mesh;
    Belt: THREE.Mesh;
    Pouch: THREE.Mesh;
    ShoelaceR: THREE.Mesh;
    Rogue: THREE.SkinnedMesh;
    Root: THREE.Bone;
  };
  materials: {
    Rogue_Texture: THREE.MeshBasicMaterial;
    Rogue_Dagger_Texture: THREE.MeshBasicMaterial;
  };
  animations: GLTFAction[];
};

type RogueProps = Omit<JSX.IntrinsicElements['group'], 'id'> & { id: string };

export function Rogue({ id, ...props }: RogueProps) {
  const group = React.useRef<THREE.Group>(null);
  const { scene, animations } = useGLTF('/Rogue.gltf');
  const clone = React.useMemo(() => SkeletonUtils.clone(scene), [scene]);
  const { nodes, materials } = useGraph(clone) as unknown as GLTFResult;
  const { actions } = useAnimations(animations, group);

  useCharacterAnimation(id, 'Rogue', actions);

  return (
    <group ref={group} {...props} dispose={null}>
      <group name="Scene">
        <group name="CharacterArmature">
          <primitive object={nodes.Root} />
          <skinnedMesh
            name="Rogue"
            geometry={nodes.Rogue.geometry}
            material={materials.Rogue_Texture}
            skeleton={nodes.Rogue.skeleton}
            castShadow
            receiveShadow
          />
        </group>
      </group>
    </group>
  );
}

useGLTF.preload('/Rogue.gltf');
