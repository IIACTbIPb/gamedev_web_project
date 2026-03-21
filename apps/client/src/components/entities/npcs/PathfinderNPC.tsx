import * as THREE from 'three';
import React, { useEffect, useMemo } from 'react';
import { useGLTF, useAnimations } from '@react-three/drei';
import { SkeletonUtils } from 'three-stdlib';
import { CapsuleCollider, RigidBody } from '@react-three/rapier';
import { PhysicsGroups } from '@/config/PhysicsGroups';

interface PathfinderNPCProps {
  position?: [number, number, number];
  rotation?: [number, number, number];
  scale?: number;
}

export function PathfinderNPC({ position = [0, 0, 0], rotation = [0, 0, 0], scale = 5 }: PathfinderNPCProps) {
  const group = React.useRef<THREE.Group>(null);

  // Загружаем модель и анимации
  const { scene, animations } = useGLTF('/Pathfinder.glb');

  // Клонируем сцену, чтобы можно было заспавнить несколько таких NPC в разных местах
  const clone = useMemo(() => SkeletonUtils.clone(scene), [scene]);

  const { actions } = useAnimations(animations, group);

  // Запускаем единственную анимацию при монтировании
  useEffect(() => {
    // Если у анимации другое имя, просто поменяй ключ (можно вывести Object.keys(actions) в консоль)
    const action = actions['All Animations'] || Object.values(actions)[0];

    if (action) {
      action.reset().fadeIn(0.5).play();
    }

    // Очистка при удалении компонента
    return () => {
      if (action) action.fadeOut(0.5);
    }
  }, [actions]);

  // Настройки коллайдера
  const capHalfHeight = 1;
  const capRadius = 1;
  const capYOffset = 2;

  return (
    <RigidBody
      type="fixed"
      colliders={false}
      position={position}
      rotation={rotation}
      collisionGroups={PhysicsGroups.DECORATION}
    >
      <CapsuleCollider args={[capHalfHeight, capRadius]} position={[0, capYOffset, 0]} />

      {/* МАГИЯ ЗДЕСЬ: 
        Вместо ручного маппинга 10 узлов, мы просто рендерим клонированную сцену.
      */}
      <group ref={group} scale={scale} dispose={null}>
        <primitive object={clone} />
      </group>
    </RigidBody>
  );
}

useGLTF.preload('/Pathfinder.glb');