import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useEntities } from 'miniplex-react';
import * as THREE from 'three';
import { ECS } from '../ecs'; // <-- Берем ECS
import type { Entity } from '../ecs';

const forwardVector = new THREE.Vector3(0, 0, 1);
const tempDirection = new THREE.Vector3();
const tempQuaternion = new THREE.Quaternion();

const Arrow = ({ entity }: { entity: Entity }) => {
  const meshRef = useRef<THREE.Mesh>(null!);

  useFrame(() => {
    if (!meshRef.current || !entity.position || !entity.velocity) return;

    meshRef.current.position.set(entity.position.x, entity.position.y, entity.position.z);
    tempDirection.set(entity.velocity.x, entity.velocity.y, entity.velocity.z);

    if (tempDirection.lengthSq() > 0.00001) {
      tempDirection.normalize();
      tempQuaternion.setFromUnitVectors(forwardVector, tempDirection);
      meshRef.current.quaternion.copy(tempQuaternion);
    }
  });

  return (
    <mesh
      ref={meshRef}
      position={[entity.position?.x || 0, entity.position?.y || 0, entity.position?.z || 0]}
    >
      <boxGeometry args={[0.08, 0.08, 1.2]} />
      <meshStandardMaterial
        color="#ffdd00"
        emissive="#ffaa00"
        emissiveIntensity={2}
        toneMapped={false}
      />
    </mesh>
  );
};

export const Projectiles = () => {
  // <-- Используем ECS.world
  const { entities } = useEntities(ECS.world.with('isProjectile', 'position', 'velocity'));

  return (
    <>
      {entities.map((entity) => (
        <Arrow key={entity.id} entity={entity} />
      ))}
    </>
  );
};
