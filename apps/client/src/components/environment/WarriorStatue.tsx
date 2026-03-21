import * as THREE from 'three';
import { useGLTF } from '@react-three/drei';
import { type GLTF } from 'three-stdlib';
import { RigidBody } from '@react-three/rapier';
import type { JSX } from 'react';
import { PhysicsGroups } from '@/config/PhysicsGroups';

type GLTFResult = GLTF & {
  nodes: {
    mesh_0: THREE.Mesh;
  };
};

// Создаем fallback-материал ОДИН РАЗ глобально, чтобы не засорять память
const fallbackMaterial = new THREE.MeshStandardMaterial({ color: 'gray' });

export function WarriorStatue(props: JSX.IntrinsicElements['group']) {
  const { nodes } = useGLTF('/WarriorMetin.glb') as unknown as GLTFResult;

  return (
    <RigidBody type="fixed" colliders="cuboid" collisionGroups={PhysicsGroups.DECORATION}>
      <group {...props} dispose={null}>
        <mesh
          geometry={nodes.mesh_0.geometry}
          material={nodes.mesh_0.material || fallbackMaterial}
        />
      </group>
    </RigidBody>
  );
}

useGLTF.preload('/WarriorMetin.glb');