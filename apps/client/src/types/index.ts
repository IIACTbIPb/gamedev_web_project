export type BaseAnimation = 'Idle' | 'Run' | 'Roll' | 'Death';

// Полные списки анимаций из GLTF (расширяют базовые):
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

// Тип для настроек одной анимации
export type AnimSettings = { loop: boolean; speed: number; fade: number };
