import type { Camera } from 'three';
import type { Entity } from '@/ecs';
import type {
  AnimSettings,
  BaseAnimation,
  RangerAnimation,
  RogueAnimation,
  WarriorAnimation,
} from '@game/shared';
import { rangerConfig, rogueConfig, warriorConfig } from '@/components/entities/characters';


export const BASE_ANIMATIONS: Record<BaseAnimation, AnimSettings> = {
  Idle: { loop: true, speed: 1, fade: 0.2 },
  Run: { loop: true, speed: 1, fade: 0.2 },
  Roll: { loop: false, speed: 1.5, fade: 0.05 },
  Death: { loop: false, speed: 1, fade: 0.2 },
  RecieveHit: { loop: false, speed: 1.5, fade: 0.05 },
  RecieveHit_2: { loop: false, speed: 1.5, fade: 0.05 },
};

export interface SkillConfig {
  id: string;
  name: string;
  icon: string;
  cooldown: number;
  onUse: (player: Entity) => void;
}

export interface ClassConfig<T extends string> {
  animations: Partial<Record<T, AnimSettings>> & Record<BaseAnimation, AnimSettings>;
  locomotion: {
    idle: T | BaseAnimation;
    run: T | BaseAnimation;
    airborne: T | BaseAnimation;
  };
  onPrimaryAttackStart: (player: Entity) => void;
  onPrimaryAttackRelease?: (player: Entity, camera: Camera) => void;
  skills?: SkillConfig[];
}

export const CLASSES_CONFIG: {
  Warrior: ClassConfig<WarriorAnimation>;
  Ranger: ClassConfig<RangerAnimation>;
  Rogue: ClassConfig<RogueAnimation>;
} = {
  Warrior: warriorConfig,
  Ranger: rangerConfig,
  Rogue: rogueConfig,
};