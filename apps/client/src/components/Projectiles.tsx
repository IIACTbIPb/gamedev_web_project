import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useEntities } from 'miniplex-react';
import * as THREE from 'three';
import { world } from '../ecs';
import type { Entity } from '../ecs';

// Выделяем память под вектора ОДИН РАЗ на уровне модуля
const forwardVector = new THREE.Vector3(0, 0, 1);
const tempDirection = new THREE.Vector3();
const tempQuaternion = new THREE.Quaternion();

const Arrow = ({ entity }: { entity: Entity }) => {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame(() => {
    if (!meshRef.current || !entity.position || !entity.velocity) return;

    // 1. Обновляем позицию (без создания новых объектов!)
    meshRef.current.position.set(entity.position.x, entity.position.y, entity.position.z);

    // 2. Копируем текущую скорость во временный вектор
    tempDirection.set(entity.velocity.x, entity.velocity.y, entity.velocity.z);

    // 3. Защита от краша (NaN): проверяем, что скорость не равна нулю
    if (tempDirection.lengthSq() > 0.00001) {
      tempDirection.normalize();
      // Вычисляем поворот и применяем его
      tempQuaternion.setFromUnitVectors(forwardVector, tempDirection);
      meshRef.current.quaternion.copy(tempQuaternion);
    }
  });

  return (
    <mesh
      ref={meshRef}
      position={[entity.position?.x || 0, entity.position?.y || 0, entity.position?.z || 0]}
    >
      {/* Сделали стрелу чуть толще и длиннее (0.08 и 1.2) */}
      <boxGeometry args={[0.08, 0.08, 1.2]} />
      {/* Добавили яркое желто-оранжевое свечение */}
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
  const { entities } = useEntities(world.with('isProjectile', 'position', 'velocity'));

  return (
    <>
      {entities.map((entity) => (
        <Arrow key={entity.id} entity={entity} />
      ))}
    </>
  );
};
