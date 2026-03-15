import * as THREE from 'three';
import React, { useEffect, useRef, type JSX } from 'react';
import { useFrame, useGraph } from '@react-three/fiber';
import { useGLTF, useAnimations } from '@react-three/drei';
import { SkeletonUtils } from 'three-stdlib';
import type { GLTF } from 'three-stdlib'; // 1. Исправлен импорт типа
import { world } from '../ecs';

type ActionName =
  | 'Death'
  | 'Idle'
  | 'Idle_Attacking'
  | 'Idle_Weapon'
  | 'PickUp'
  | 'Punch'
  | 'RecieveHit'
  | 'Roll'
  | 'Run'
  | 'Run_Weapon'
  | 'Sword_Attack'
  | 'Sword_Attack2'
  | 'Walk';

interface GLTFAction extends THREE.AnimationClip {
  name: ActionName;
}

type GLTFResult = GLTF & {
  nodes: {
    Face: THREE.Mesh;
    ShoulderPadL: THREE.Mesh;
    Warrior_Sword: THREE.Mesh;
    ShoulderPadR: THREE.Mesh;
    Warrior_Body: THREE.SkinnedMesh;
    Root: THREE.Bone;
  };
  materials: {
    Warrior_Texture: THREE.MeshBasicMaterial;
    Warrior_Sword_Texture: THREE.MeshBasicMaterial;
  };
  animations: GLTFAction[];
};

type WarriorProps = Omit<JSX.IntrinsicElements['group'], 'id'> & { id: string };

const ANIM_CONFIG: Partial<Record<ActionName, { loop: boolean; speed: number; fade: number }>> = {
  Idle: { loop: true, speed: 1, fade: 0.2 },
  Run: { loop: true, speed: 1, fade: 0.2 },
  Walk: { loop: true, speed: 1, fade: 0.2 },
  Roll: { loop: false, speed: 1.5, fade: 0.05 },
  Sword_Attack: { loop: false, speed: 1, fade: 0.05 },
  Sword_Attack2: { loop: false, speed: 1, fade: 0.05 },
  Punch: { loop: false, speed: 1, fade: 0.05 },
  Death: { loop: false, speed: 1, fade: 0.2 },
  RecieveHit: { loop: false, speed: 1, fade: 0.05 },
};

export function Warrior({ id, ...props }: WarriorProps) {
  const group = React.useRef<THREE.Group>(null);
  const { scene, animations } = useGLTF('/Warrior.gltf');
  const clone = React.useMemo(() => SkeletonUtils.clone(scene), [scene]);
  const { nodes, materials } = useGraph(clone) as unknown as GLTFResult;
  const { actions } = useAnimations(animations, group);

  // Ссылка для хранения текущей проигрываемой анимации
  const currentAnim = useRef<ActionName>('Idle');

  useEffect(() => {
    // Проходимся по всему словарю и настраиваем движок разом
    Object.entries(ANIM_CONFIG).forEach(([animName, config]) => {
      const action = actions[animName as ActionName];
      if (!action) return;

      action.setEffectiveTimeScale(config.speed);

      if (config.loop) {
        action.setLoop(THREE.LoopRepeat, Infinity);
      } else {
        action.setLoop(THREE.LoopOnce, 1);
        action.clampWhenFinished = true; // Замираем в конце, если не луп
      }
    });

    if (actions['Idle']) actions['Idle'].reset().play();
  }, [actions]);

  // Каждый кадр проверяем, не сменилась ли анимация в ECS
  useFrame(() => {
    const entity = world.where((e) => e.id === id).first;
    if (!entity || !entity.currentAnimation) return;

    const nextAnim = entity.currentAnimation as ActionName;

    if (nextAnim !== currentAnim.current) {
      const currentAction = actions[currentAnim.current];
      const nextAction = actions[nextAnim];

      if (currentAction && nextAction) {
        // Берем время затухания прямо из конфига (или 0.2 по умолчанию)
        const fadeTime = ANIM_CONFIG[nextAnim]?.fade || 0.2;

        currentAction.fadeOut(fadeTime);
        nextAction.reset().fadeIn(fadeTime).play();

        currentAnim.current = nextAnim;
      }
    }
  });

  return (
    <group ref={group} {...props} dispose={null}>
      <group name="Scene">
        <group name="CharacterArmature">
          <primitive object={nodes.Root} />
          <skinnedMesh
            name="Warrior_Body"
            geometry={nodes.Warrior_Body.geometry}
            material={materials.Warrior_Texture}
            skeleton={nodes.Warrior_Body.skeleton}
            // Включаем отбрасывание теней для красоты
            castShadow
            receiveShadow
          />
        </group>
      </group>
    </group>
  );
}

useGLTF.preload('/Warrior.gltf');
