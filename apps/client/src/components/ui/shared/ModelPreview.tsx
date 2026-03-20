import { useRef, useEffect } from 'react';
import { useGLTF, useAnimations } from '@react-three/drei';
import { useFrame } from '@react-three/fiber'; // <-- ДОБАВИЛИ ИМПОРТ
import * as THREE from 'three';

interface ModelPreviewProps {
  url: string;
  scale?: number;
  position?: [number, number, number];
}

export const ModelPreview = ({ url, scale = 1, position = [0, 0, 0] }: ModelPreviewProps) => {
  const group = useRef<THREE.Group>(null);
  const { scene, animations } = useGLTF(url);
  const { actions } = useAnimations(animations, group);

  useEffect(() => {
    // Включаем анимацию
    const idleAction = actions['Idle'];
    if (idleAction) {
      idleAction.reset().fadeIn(0.2).play();
    }
    // Нам больше не нужно возвращать функцию очистки для отмены анимации, 
    // R3F сделает всё сам!
  }, [actions]);

  // === ПРАВИЛЬНОЕ ВРАЩЕНИЕ В R3F ===
  useFrame((_state, delta) => {
    if (group.current) {
      // delta - это время между кадрами. 
      // Умножая на скорость (например, 0.3), мы получаем плавное вращение
      // независимое от FPS монитора!
      group.current.rotation.y += delta * 0.3;
    }
  });

  return (
    <group ref={group} scale={scale} position={position}>
      <primitive object={scene} castShadow receiveShadow />
    </group>
  );
};