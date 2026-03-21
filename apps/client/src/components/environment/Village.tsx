import { RigidBody, CuboidCollider } from '@react-three/rapier';
import { LEVEL_01 } from './MapConfig';
import { House } from './House';
import { PhysicsGroups } from '@/config/PhysicsGroups';

export const Village = () => {
  const houseData = LEVEL_01.houses;

  if (houseData.length === 0) return null;

  return (
    <group>
      {houseData.map((house) => (
        <RigidBody
          key={`physics_house_${house.id}`}
          type="fixed"
          colliders={false} // <-- 1. ОТКЛЮЧАЕМ ТЯЖЕЛУЮ АВТОМАТИКУ
          collisionGroups={PhysicsGroups.ENVIRONMENT}
          // 2. Переносим позицию и вращение на RigidBody, а не на саму модель!
          position={house.position}
          rotation={house.rotation}
        >
          {/* 3. СТАВИМ РУЧНОЙ КОЛЛАЙДЕР (Невидимую коробку) */}
          {/* ВНИМАНИЕ: args в Rapier — это ПОЛОВИНА размера куба (halfExtents). 
              Например, args={[2, 3, 2]} создаст коробку шириной 4, высотой 6 и глубиной 4. 
              Подбери эти значения под размер твоего домика! */}
          <CuboidCollider
            args={[
              2.5 * house.scale[0], // Ширина * масштаб X
              3 * house.scale[1], // Высота * масштаб Y
              3 * house.scale[2]  // Глубина * масштаб Z
            ]}
            // Сдвигаем центр вверх тоже с учетом масштаба по Y
            position={[0, 0, 0]}
          />

          {/* А вот крышу можно накрыть вторым коллайдером, если нужно (например, если игроки могут на нее прыгать) */}
          {/* <CuboidCollider args={[2.2, 1, 2.2]} position={[0, 6.5, 0]} /> */}

          {/* 4. Визуальная модель дома (внутри RigidBody она автоматически примет его позицию) */}
          <House
            scale={house.scale}
            wallColor={house.wallColor}
          />
        </RigidBody>
      ))}
    </group>
  );
};