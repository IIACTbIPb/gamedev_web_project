import * as THREE from 'three'
import { InstancedRigidBodies } from '@react-three/rapier';
import { Instances, Instance, useGLTF } from '@react-three/drei';
import type { GLTF } from 'three-stdlib';
import { LEVEL_01, type TreeData } from './MapConfig';
import { PhysicsGroups } from '@/config/PhysicsGroups';

// === ТИПЫ ИЗ ТВОЕЙ МОДЕЛИ ===
type GLTFResult = GLTF & {
  nodes: {
    Cone001: THREE.Mesh;
    Cone001_1: THREE.Mesh;
  };
  materials: {
    pine_underscore_nidles: THREE.MeshStandardMaterial;
    bark_material: THREE.MeshStandardMaterial;
  };
};

export const Forest = () => {
  // Указываем TypeScript, что тут лежат данные с цветами
  const treeData = LEVEL_01.trees as TreeData[];

  const { nodes, materials } = useGLTF('/mountain_tree.glb') as unknown as GLTFResult;

  if (treeData.length === 0) return null;

  const instances = treeData.map((tree) => ({
    key: `physics_${tree.id}`,
    position: tree.position,
    rotation: tree.rotation,
    scale: tree.scale,
    collisionGroups: PhysicsGroups.DECORATION,
  }));

  return (
    <group>
      {/* 1. СТВОЛЫ (Без изменений) */}
      <InstancedRigidBodies instances={instances} type="fixed" colliders="cuboid" collisionGroups={PhysicsGroups.DECORATION}>
        <Instances
          range={treeData.length}
          geometry={nodes.Cone001_1.geometry}
          material={materials.bark_material}
          castShadow
          receiveShadow
        >
          {treeData.map((tree) => (
            <Instance
              key={`trunk_${tree.id}`}
              position={tree.position}
              rotation={tree.rotation}
              scale={tree.scale}
            />
          ))}
        </Instances>
      </InstancedRigidBodies>

      {/* 2. ИГОЛКИ / ЛИСТВА (Добавили цвет!) */}
      <Instances
        range={treeData.length}
        geometry={nodes.Cone001.geometry}
        material={materials.pine_underscore_nidles}
        castShadow
        receiveShadow
      >
        {treeData.map((tree) => (
          <Instance
            key={`leaves_${tree.id}`}
            position={tree.position}
            rotation={tree.rotation}
            scale={tree.scale}
            color={tree.leafColor || '#ffffff'} // <-- МАГИЯ ЗДЕСЬ! Если цвета нет, используем белый
          />
        ))}
      </Instances>
    </group>
  );
};

// Предзагрузка модели, чтобы не было лагов при рендере
useGLTF.preload('/mountain_tree.glb');