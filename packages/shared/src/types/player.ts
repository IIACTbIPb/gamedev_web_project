export type CharacterClass = 'Warrior' | 'Ranger' | 'Rogue';

export interface PlayerState {
  id: string;
  position: { x: number; y: number; z: number };
  classType: CharacterClass;
  hp: number;
  maxHp: number;
  name: string;
}

export type GameState = Record<string, PlayerState>;

export type BaseAnimation = 'Idle' | 'Run' | 'Roll' | 'Death' | 'RecieveHit' | 'RecieveHit_2';

export type WarriorAnimation =
  | BaseAnimation
  | 'Idle_Attacking'
  | 'Idle_Weapon'
  | 'PickUp'
  | 'Punch'
  | 'RecieveHit'
  | 'Run_Weapon'
  | 'Sword_Attack'
  | 'Sword_Attack2'
  | 'Walk';

export type RangerAnimation =
  | BaseAnimation
  | 'Bow_Draw'
  | 'Bow_Shoot'
  | 'Idle_Attacking'
  | 'Idle_Weapon'
  | 'PickUp'
  | 'Punch'
  | 'RecieveHit'
  | 'RecieveHit_2'
  | 'Run_Holding'
  | 'Walk';

export type RogueAnimation =
  | 'Attacking_Idle'
  | 'Dagger_Attack'
  | 'Dagger_Attack2'
  | 'Death'
  | 'Idle'
  | 'PickUp'
  | 'Punch'
  | 'RecieveHit'
  | 'RecieveHit_2'
  | 'Roll'
  | 'Run'
  | 'Walk';

export type AnyAnimation = WarriorAnimation | RangerAnimation | RogueAnimation;

// AnimSettings тоже можно вынести сюда, если они нужны в разных местах
export type AnimSettings = { loop: boolean; speed: number; fade: number };

export interface SkillStats {
  damage: number;
  cooldown: number;
  duration: number;
  speedBuff?: number;
}

export interface ClassStats {
  baseHp: number;
  baseSpeed: number;
  primaryDamage: number;
  skill1: SkillStats;
  skill2: SkillStats;
}