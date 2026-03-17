export type CharacterClass = 'Warrior' | 'Ranger';

export interface PlayerState {
  id: string;
  position: { x: number; y: number; z: number };
  classType: CharacterClass;
  hp: number;
  maxHp: number;
}

export type GameState = Record<string, PlayerState>;

export type BaseAnimation = 'Idle' | 'Run' | 'Roll' | 'Death';

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

export type AnyAnimation = WarriorAnimation | RangerAnimation;

// AnimSettings тоже можно вынести сюда, если они нужны в разных местах
export type AnimSettings = { loop: boolean; speed: number; fade: number };
