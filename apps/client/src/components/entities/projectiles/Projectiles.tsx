import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useEntities } from 'miniplex-react';
import * as THREE from 'three';
import { ECS, type Entity } from '@/ecs';


const forwardVector = new THREE.Vector3(0, 0, 1);
const tempDirection = new THREE.Vector3();
const tempQuaternion = new THREE.Quaternion();

const Arrow = ({ entity }: { entity: Entity }) => {
  const meshRef = useRef<THREE.Mesh>(null!);

  useFrame(() => {
    // В R3F refs могут быть null в первый микротик, поэтому проверка обязательна
    if (!meshRef.current || !entity.position || !entity.velocity) return;

    // 1. Двигаем стрелу
    meshRef.current.position.set(entity.position.x, entity.position.y, entity.position.z);

    // 2. Поворачиваем стрелу по вектору её полета
    tempDirection.set(entity.velocity.x, entity.velocity.y, entity.velocity.z);

    if (tempDirection.lengthSq() > 0.00001) {
      tempDirection.normalize();
      tempQuaternion.setFromUnitVectors(forwardVector, tempDirection);
      meshRef.current.quaternion.copy(tempQuaternion);
    }
  });

  return (
    <mesh ref={meshRef}>
      {/* Сдвигаем геометрию по Z, чтобы центр меша был на острие стрелы, а не в её центре */}
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
  const { entities } = useEntities(ECS.world.with('isProjectile', 'position', 'velocity'));

  return (
    <group>
      {entities.map((entity) => (
        <Arrow key={entity.id} entity={entity} />
      ))}
    </group>
  );
};
