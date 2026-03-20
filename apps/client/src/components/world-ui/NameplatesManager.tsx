import * as THREE from 'three';
import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text } from '@react-three/drei';
import { useEntities } from 'miniplex-react';
import { ECS, type Entity } from '@/ecs';

// === ОТДЕЛЬНЫЙ КОМПОНЕНТ ДЛЯ ОДНОГО ИГРОКА ===
// Мы выносим его, чтобы у каждого игрока был свой useFrame для плавного следования
const PlayerNameplate: React.FC<{ entity: Entity }> = ({ entity }) => {
  const groupRef = useRef<THREE.Group>(null);
  const hpBarRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (!groupRef.current || !entity.rigidBody) return;

    // 1. Следим за позицией игрока
    const pos = entity.rigidBody.translation();
    // Поднимаем табличку на 2.8 метра (чуть выше головы и цифр урона)
    groupRef.current.position.set(pos.x, pos.y + 2.8, pos.z);

    // 2. Биллбординг (всегда смотрим в камеру)
    groupRef.current.quaternion.copy(state.camera.quaternion);

    // 3. Динамически меняем длину полоски ХП
    if (hpBarRef.current && entity.hp !== undefined && entity.maxHp) {
      const hpPercent = Math.max(0, entity.hp / entity.maxHp);
      // Масштабируем зеленую полоску по оси X
      hpBarRef.current.scale.x = hpPercent;
      // Сдвигаем её влево, чтобы она уменьшалась корректно (от правого края к левому)
      // Базовая ширина 1.5, поэтому сдвиг = (1 - percent) * width / 2
      hpBarRef.current.position.x = ((hpPercent - 1) * 1.5) / 2;

      // Меняем цвет: если ХП меньше 30% - красная, иначе зеленая
      const mat = hpBarRef.current.material as THREE.MeshBasicMaterial;
      mat.color.setHex(hpPercent < 0.3 ? 0xff2222 : 0x22ff22);
    }
  });

  // Если игрок мертв — прячем табличку
  if (entity.hp !== undefined && entity.hp <= 0) return null;

  // Если сервер пока не присылает имена, используем класс игрока или ID как заглушку
  const displayName = entity.name || entity.classType || `Player_${entity.id?.substring(0, 4)}`;

  return (
    <group ref={groupRef}>
      {/* 1. НИКНЕЙМ */}
      <Text
        position={[0, entity.isMe ? 0.3 : 0.5, 0]}
        fontSize={0.3}
        color={entity.isMe ? "#ffff00" : "#ffffff"} // Себя подсвечиваем желтоватым
        fontWeight="bold"
        anchorX="center"
        anchorY="bottom"
        outlineWidth={0.03}
        outlineColor="#000000"
        material-depthTest={false} // Чтобы не проваливалось в текстуры
        renderOrder={998}
      >
        {displayName}
      </Text>

      {!entity.isMe && (
        <>
          {/* 2. ФОН ХП-БАРА (Темно-серый) */}
          <mesh position={[0, 0.3, -0.01]} material-depthTest={false} renderOrder={997}>
            <planeGeometry args={[1.5, 0.15]} />
            <meshBasicMaterial color="#333333" />
          </mesh>

          {/* 3. САМА ПОЛОСКА ХП (Зеленая/Красная) */}
          <mesh ref={hpBarRef} position={[0, 0.3, 0]} material-depthTest={false} renderOrder={998}>
            <planeGeometry args={[1.5, 0.15]} />
            <meshBasicMaterial color="#22ff22" />
          </mesh>
        </>
      )}
    </group>
  );
};

// === ГЛАВНЫЙ МЕНЕДЖЕР ===
export const NameplatesManager: React.FC = () => {
  // Ищем всех сущностей, у которых есть ХП и физическое тело
  const { entities } = useEntities(ECS.world.with('hp', 'maxHp', 'rigidBody'));

  return (
    <group>
      {entities.map((entity) => (
        <PlayerNameplate key={entity.id} entity={entity} />
      ))}
    </group>
  );
};