import { Grid } from '@react-three/drei';
import { RigidBody } from '@react-three/rapier';

export const Ground = () => {
  return (
    <group>
      {/* 1. Наш физический пол (основа, по которой ходим) */}
      <RigidBody type="fixed" colliders="cuboid">
        <mesh receiveShadow position={[0, -0.5, 0]}>
          <boxGeometry args={[100, 1, 100]} />
          <meshStandardMaterial color="#13231a" />
        </mesh>
      </RigidBody>

      {/* 2. Визуальная сетка ВНЕ физического тела (движок её игнорирует) */}
      <Grid
        position={[0, 0.01, 0]}
        args={[100, 100]}
        cellSize={1}
        cellThickness={1}
        cellColor="#2c4c3b"
        sectionSize={5}
        sectionThickness={1.5}
        sectionColor="#3b6b52"
        fadeDistance={40}
        fadeStrength={1.5}
      />
    </group>
  );
};
