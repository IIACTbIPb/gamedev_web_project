import { useRef, useEffect, useMemo } from 'react';
import { useGLTF, useAnimations } from '@react-three/drei';
import { SkeletonUtils } from 'three-stdlib';
import * as THREE from 'three';

interface ModelPreviewProps {
  url: string;
  scale?: number;
  position?: [number, number, number];
  rotationY?: number; // Добавили возможность передавать ротацию извне
}

export const ModelPreview = ({ url, scale = 1, position = [0, 0, 0], rotationY = 0 }: ModelPreviewProps) => {
  const group = useRef<THREE.Group>(null);
  const { scene, animations } = useGLTF(url);
  const clone = useMemo(() => SkeletonUtils.clone(scene), [scene]);
  const { actions } = useAnimations(animations, group);

  useEffect(() => {
    const idleAction = actions['Idle'] || Object.values(actions)[0];
    if (idleAction) {
      idleAction.reset().fadeIn(0.2).play();
    }
    return () => {
      if (idleAction) idleAction.fadeOut(0.2);
    };
  }, [actions]);

  // УБРАЛИ useFrame с авто-вращением
  // Теперь вращение контролируется только пропсами или внешними контроллерами

  return (
    <group ref={group} scale={scale} position={position} rotation={[0, rotationY, 0]} dispose={null}>
      <primitive object={clone} castShadow receiveShadow />
    </group>
  );
};
