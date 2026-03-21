import * as THREE from 'three';
import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text } from '@react-three/drei';
import { useEntities } from 'miniplex-react';
import { ECS, type Entity } from '@/ecs';

// === ОПТИМИЗАЦИЯ ПАМЯТИ: Глобальные ресурсы ===
// Создаем геометрию и фон ОДИН раз для всех ХП-баров в игре
const sharedHpGeometry = new THREE.PlaneGeometry(1.5, 0.15);
const sharedBgMaterial = new THREE.MeshBasicMaterial({ color: "#333333", depthTest: false });

const PlayerNameplate: React.FC<{ entity: Entity }> = ({ entity }) => {
  const groupRef = useRef<THREE.Group>(null);
  const hpBarRef = useRef<THREE.Mesh>(null);

  // Кэшируем состояние цвета, чтобы не менять его 60 раз в секунду
  const isLowHpRef = useRef(false);

  useFrame((state) => {
    if (!groupRef.current || !entity.rigidBody) return;

    const pos = entity.rigidBody.translation();
    groupRef.current.position.set(pos.x, pos.y + 2.8, pos.z);
    groupRef.current.quaternion.copy(state.camera.quaternion);

    if (hpBarRef.current && entity.hp !== undefined && entity.maxHp) {
      const hpPercent = Math.max(0, entity.hp / entity.maxHp);

      hpBarRef.current.scale.x = hpPercent;
      hpBarRef.current.position.x = ((hpPercent - 1) * 1.5) / 2;

      // === ОПТИМИЗАЦИЯ ПРОЦЕССОРА ===
      // Меняем цвет только в момент ПЕРЕХОДА через порог 30%
      const isCurrentlyLow = hpPercent < 0.3;
      if (isCurrentlyLow !== isLowHpRef.current) {
        isLowHpRef.current = isCurrentlyLow;
        const mat = hpBarRef.current.material as THREE.MeshBasicMaterial;
        mat.color.setHex(isCurrentlyLow ? 0xff2222 : 0x22ff22);
      }
    }
  });

  if (entity.hp !== undefined && entity.hp <= 0) return null;

  const displayName = entity.name || entity.classType || `Player_${entity.id?.substring(0, 4)}`;

  return (
    <group ref={groupRef}>
      <Text
        position={[0, entity.isMe ? 0.3 : 0.5, 0]}
        fontSize={0.3}
        color={entity.isMe ? "#ffff00" : "#ffffff"}
        fontWeight="bold"
        anchorX="center"
        anchorY="bottom"
        outlineWidth={0.03}
        outlineColor="#000000"
        material-depthTest={false}
        renderOrder={998}
      >
        {displayName}
      </Text>

      {!entity.isMe && (
        <>
          {/* Используем общие (shared) геометрию и материал для фона */}
          <mesh
            position={[0, 0.3, -0.01]}
            geometry={sharedHpGeometry}
            material={sharedBgMaterial}
            renderOrder={997}
          />

          {/* Используем общую геометрию, но уникальный материал, т.к. цвет меняется */}
          <mesh ref={hpBarRef} position={[0, 0.3, 0]} geometry={sharedHpGeometry} renderOrder={998}>
            <meshBasicMaterial color="#22ff22" depthTest={false} />
          </mesh>
        </>
      )}
    </group>
  );
};

export const NameplatesManager: React.FC = () => {
  const { entities } = useEntities(ECS.world.with('hp', 'maxHp', 'rigidBody'));

  return (
    <group>
      {entities.map((entity) => (
        <PlayerNameplate key={entity.id} entity={entity} />
      ))}
    </group>
  );
};