import { useRef, useEffect, useMemo } from 'react';
import { useGLTF, useAnimations } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { SkeletonUtils } from 'three-stdlib'; // <-- ДОБАВИЛИ УТИЛИТУ КЛОНИРОВАНИЯ
import * as THREE from 'three';

interface ModelPreviewProps {
  url: string;
  scale?: number;
  position?: [number, number, number];
}

export const ModelPreview = ({ url, scale = 1, position = [0, 0, 0] }: ModelPreviewProps) => {
  const group = useRef<THREE.Group>(null);

  const { scene, animations } = useGLTF(url);

  // === ОПТИМИЗАЦИЯ 1: БЕЗОПАСНОЕ КЛОНИРОВАНИЕ ===
  // Теперь ты можешь отрендерить хоть 100 одинаковых превьюшек, и они не сломаются
  const clone = useMemo(() => SkeletonUtils.clone(scene), [scene]);

  const { actions } = useAnimations(animations, group);

  useEffect(() => {
    // Ищем Idle, а если его нет (другое название), берем первую попавшуюся анимацию
    const idleAction = actions['Idle'] || Object.values(actions)[0];

    if (idleAction) {
      idleAction.reset().fadeIn(0.2).play();
    }

    // === ОПТИМИЗАЦИЯ 2: ЧИСТАЯ ПАМЯТЬ ===
    // Если url изменится (игрок переключил перса), плавно гасим старую анимацию
    return () => {
      if (idleAction) {
        idleAction.fadeOut(0.2);
      }
    };
  }, [actions]);

  // === ПЛАВНОЕ ВРАЩЕНИЕ ===
  useFrame((_state, delta) => {
    if (group.current) {
      group.current.rotation.y += delta * 0.3;
    }
  });

  return (
    <group ref={group} scale={scale} position={position} dispose={null}>
      {/* Используем клон вместо оригинальной scene */}
      <primitive object={clone} castShadow receiveShadow />
    </group>
  );
};