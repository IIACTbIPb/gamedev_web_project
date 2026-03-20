import { RigidBody } from '@react-three/rapier';
import { LEVEL_01 } from './MapConfig';
import { House } from './House';

export const Village = () => {
  const houseData = LEVEL_01.houses;

  if (houseData.length === 0) return null;

  return (
    <group>
      {houseData.map((house) => (
        // trimesh создаст идеальную физическую копию дома по его геометрии!
        <RigidBody
          key={`physics_house_${house.id}`}
          type="fixed"
          colliders="trimesh"
        >
          <House
            position={house.position}
            rotation={house.rotation}
            scale={house.scale}
            wallColor={house.wallColor}
          />
        </RigidBody>
      ))}
    </group>
  );
};