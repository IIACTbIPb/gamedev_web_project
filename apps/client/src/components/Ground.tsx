import { RigidBody } from '@react-three/rapier';

export const Ground = () => {
  return (
    // type="fixed" означает, что объект неподвижен
    <RigidBody type="fixed" colliders="cuboid">
      {/* Смещаем платформу немного вниз, чтобы центр координат (0,0,0) был на поверхности */}
      <mesh position={[0, -0.5, 0]}>
        <boxGeometry args={[30, 1, 30]} />
        <meshStandardMaterial color="#2e3f2d" />
      </mesh>
    </RigidBody>
  );
};
