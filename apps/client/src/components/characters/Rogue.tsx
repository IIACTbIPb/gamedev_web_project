import * as THREE from 'three';
import React, { type JSX } from 'react';
import { useGraph, useFrame } from '@react-three/fiber';
import { useGLTF, useAnimations } from '@react-three/drei';
import { type GLTF, SkeletonUtils } from 'three-stdlib';
import { useCharacterAnimation } from '../../hooks/useCharacterAnimation';
import { ECS } from '../../ecs';
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

  // Создаем динамические материалы для тела и оружия
  const { dynamicBodyMat, dynamicDaggerMat } = React.useMemo(() => {
    const bodyMat = materials.Rogue_Texture.clone();
    bodyMat.transparent = true;
    const daggerMat = materials.Rogue_Dagger_Texture.clone();
    daggerMat.transparent = true;

    // Проходим по всему клонированному графу и подменяем материалы
    clone.traverse((child) => {
      const mesh = child as THREE.Mesh;
      if (mesh.isMesh) {
        if (mesh.material === materials.Rogue_Texture) {
          mesh.material = bodyMat;
        } else if (mesh.material === materials.Rogue_Dagger_Texture) {
          mesh.material = daggerMat;
        }
      }
    });

    return { dynamicBodyMat: bodyMat, dynamicDaggerMat: daggerMat };
  }, [clone, materials]);

  // Каждый кадр проверяем состояние сущности (минуя React state, для макс. FPS)
  useFrame(() => {
    const entity = ECS.world.where((e) => e.id === id).first;
    if (entity) {
      if (entity.isInvisible) {
        const opacity = entity.isMe ? 0.3 : 0.0;
        const depthWrite = !!entity.isMe;

        dynamicBodyMat.opacity = opacity;
        dynamicBodyMat.depthWrite = depthWrite;

        dynamicDaggerMat.opacity = opacity;
        dynamicDaggerMat.depthWrite = depthWrite;
      } else {
        dynamicBodyMat.opacity = 1.0;
        dynamicBodyMat.depthWrite = true;

        dynamicDaggerMat.opacity = 1.0;
        dynamicDaggerMat.depthWrite = true;
      }
    }
  });

  useCharacterAnimation(id, 'Rogue', actions);

  return (
    <group ref={group} {...props} dispose={null}>
      <group name="Scene">
        <group name="CharacterArmature">
          <primitive object={nodes.Root} />
          <skinnedMesh
            name="Rogue"
            geometry={nodes.Rogue.geometry}
            material={dynamicBodyMat}
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
