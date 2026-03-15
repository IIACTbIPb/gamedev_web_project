import { useEffect, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { world } from '../ecs';
import { CLASSES_CONFIG } from '../classesConfig';
import type { CharacterClass } from '@game/shared';
import type { AnimSettings, AnyAnimation } from '../types';

export const useCharacterAnimation = (
  id: string,
  classType: CharacterClass, // <-- Теперь хук знает, какой это класс
  actions: Record<string, THREE.AnimationAction | null>,
) => {
  const currentAnim = useRef<string>('Idle');

  // Берем анимации конкретного класса из нашего реестра
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

    if (actions['Idle']) actions['Idle'].reset().play();
  }, [actions, classAnimations]);

  useFrame(() => {
    const entity = world.where((e) => e.id === id).first;
    if (!entity || !entity.currentAnimation) return;

    const nextAnim = entity.currentAnimation as AnyAnimation;

    if (nextAnim !== currentAnim.current) {
      const currentAction = actions[currentAnim.current];
      const nextAction = actions[nextAnim];

      if (currentAction && nextAction) {
        // Ищем fade настройки в конфиге класса
        const animConfig = classAnimations[nextAnim as keyof typeof classAnimations];
        const fadeTime = animConfig?.fade || 0.2;

        currentAction.fadeOut(fadeTime);
        nextAction.reset().fadeIn(fadeTime).play();
        currentAnim.current = nextAnim;
      }
    }
  });
};
