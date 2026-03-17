import { useRef, useEffect } from 'react';
import { useGLTF, useAnimations } from '@react-three/drei';
import * as THREE from 'three';

interface ModelPreviewProps {
  url: string;
  scale?: number;
  position?: [number, number, number];
}

// Универсальный компонент для просмотра модели в меню
export const ModelPreview = ({ url, scale = 1, position = [0, 0, 0] }: ModelPreviewProps) => {
  const group = useRef<THREE.Group>(null);
  const { scene, animations } = useGLTF(url);
  const { actions } = useAnimations(animations, group);

  useEffect(() => {
    // Включаем Idle анимацию, если она есть
    const idleAction = actions['Idle'];
    if (idleAction) {
      idleAction.reset().fadeIn(0.2).play();
    }

    // Медленное вращение для красоты
    let frameId: number;
    const animate = () => {
      if (group.current) group.current.rotation.y += 0.005;
      frameId = requestAnimationFrame(animate);
    };
    animate();

    return () => cancelAnimationFrame(frameId);
  }, [actions]);

  return (
    <group ref={group} scale={scale} position={position}>
      {/* Применяем тени для красоты */}
      <primitive object={scene} castShadow receiveShadow />
    </group>
  );
};
