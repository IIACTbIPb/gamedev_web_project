import { useEffect, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { ECS } from '@/ecs';
import { CLASSES_CONFIG } from '@/classesConfig';
import type { AnimSettings, AnyAnimation, CharacterClass } from '@game/shared';

export const useCharacterAnimation = (
  id: string,
  classType: CharacterClass,
  actions: Record<string, THREE.AnimationAction | null>,
) => {
  const defaultAnim = CLASSES_CONFIG[classType].locomotion.idle as string;
  const currentAnim = useRef<string>(defaultAnim);
  const classAnimations = CLASSES_CONFIG[classType].animations;

  useEffect(() => {
    const entries = Object.entries(classAnimations) as [AnyAnimation, AnimSettings][];
    entries.forEach(([animName, config]) => {
      const action = actions[animName];
      if (!action) return;

      action.setEffectiveTimeScale(config.speed);

      if (config.loop) {
        action.setLoop(THREE.LoopRepeat, Infinity);
      } else {
        action.setLoop(THREE.LoopOnce, 1);
        action.clampWhenFinished = true;
      }
    });

    if (actions[defaultAnim]) actions[defaultAnim].reset().play();
  }, [actions, classAnimations, defaultAnim]);

  useFrame(() => {
    const entity = ECS.world.where((e) => e.id === id).first;
    if (!entity || !entity.currentAnimation) return;

    const nextAnim = entity.currentAnimation as AnyAnimation;

    if (nextAnim !== currentAnim.current) {
      const currentAction = actions[currentAnim.current];
      const nextAction = actions[nextAnim];

      if (currentAction && nextAction) {
        const animConfig = classAnimations[nextAnim as keyof typeof classAnimations];
        const fadeTime = animConfig?.fade || 0.2;

        currentAction.fadeOut(fadeTime);
        nextAction.reset().fadeIn(fadeTime).play();
        currentAnim.current = nextAnim;
      }
    }
  });
};
