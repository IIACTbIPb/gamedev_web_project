import { useEffect, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { world } from '../ecs';

// 1. УНИВЕРСАЛЬНЫЙ СЛОВАРЬ (для всех персонажей игры)
const ANIM_CONFIG: Record<string, { loop: boolean; speed: number; fade: number }> = {
  Idle: { loop: true, speed: 1, fade: 0.2 },
  Run: { loop: true, speed: 1, fade: 0.2 },
  Roll: { loop: false, speed: 1.5, fade: 0.05 },
  // Атаки Воина:
  Sword_Attack: { loop: false, speed: 1, fade: 0.05 },
  // Атаки Рейнджера:
  Bow_Shoot: { loop: false, speed: 1, fade: 0.05 },
  // Общие:
  Death: { loop: false, speed: 1, fade: 0.2 },
};

// 2. САМ ХУК
export const useCharacterAnimation = (
  id: string,
  actions: Record<string, THREE.AnimationAction | null>,
) => {
  // Ссылка для хранения текущей проигрываемой анимации
  const currentAnim = useRef<string>('Idle');

  // Настраиваем все доступные анимации при загрузке
  useEffect(() => {
    Object.entries(ANIM_CONFIG).forEach(([animName, config]) => {
      const action = actions[animName];
      if (!action) return; // Если у модели нет такой анимации - просто пропускаем

      action.setEffectiveTimeScale(config.speed);

      if (config.loop) {
        action.setLoop(THREE.LoopRepeat, Infinity);
      } else {
        action.setLoop(THREE.LoopOnce, 1);
        action.clampWhenFinished = true;
      }
    });

    if (actions['Idle']) actions['Idle'].reset().play();
  }, [actions]);

  // Плавно переключаем анимации на основе ECS
  useFrame(() => {
    const entity = world.where((e) => e.id === id).first;
    if (!entity || !entity.currentAnimation) return;

    const nextAnim = entity.currentAnimation;

    if (nextAnim !== currentAnim.current) {
      const currentAction = actions[currentAnim.current];
      const nextAction = actions[nextAnim];

      if (currentAction && nextAction) {
        const fadeTime = ANIM_CONFIG[nextAnim]?.fade || 0.2;
        currentAction.fadeOut(fadeTime);
        nextAction.reset().fadeIn(fadeTime).play();
        currentAnim.current = nextAnim;
      }
    }
  });
};
