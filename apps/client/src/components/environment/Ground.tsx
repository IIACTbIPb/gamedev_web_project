import { Grid } from '@react-three/drei';
import type { ThreeEvent } from '@react-three/fiber';
import { RigidBody } from '@react-three/rapier';

export const Ground = () => {


  const handleGroundClick = (e: ThreeEvent<MouseEvent>) => {
    // Работает только если зажат Shift (чтобы не мешать обычной игре)
    if (!e.shiftKey) return;

    e.stopPropagation(); // Останавливаем клик, чтобы не пошел дальше

    // Берем точную точку соприкосновения луча мыши с землей
    const { x, z } = e.point;

    // Генерируем случайный поворот и скейл для разнообразия
    const randomRotY = (Math.random() * Math.PI * 2).toFixed(2);
    const randomScale = (0.8 + Math.random() * 0.4).toFixed(2);

    // Формируем строчку для MapConfig.ts
    const codeSnippet = `{ id: 'tree_${Math.floor(Math.random() * 1000)}', position: [${x.toFixed(2)}, 0, ${z.toFixed(2)}], rotation: [0, ${randomRotY}, 0], scale: [${randomScale}, ${randomScale}, ${randomScale}] },`;

    console.log("%cСкопируй это в MapConfig.ts:", "color: #00ff00; font-weight: bold; font-size: 14px;");
    console.log(codeSnippet);

    // Бонус: можно даже автоматически копировать в буфер обмена!
    navigator.clipboard.writeText(codeSnippet).then(() => {
      console.log("✅ Скопировано в буфер обмена!");
    });
  };

  return (
    <group>
      {/* 1. Наш физический пол (основа, по которой ходим) */}
      <RigidBody type="fixed" colliders="cuboid">
        <mesh receiveShadow position={[0, -0.5, 0]} onPointerDown={handleGroundClick}>
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
