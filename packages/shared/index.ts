export type CharacterClass = 'Warrior' | 'Ranger';

export interface PlayerState {
  id: string;
  position: { x: number; y: number; z: number };
  classType: CharacterClass;
  hp: number;
  maxHp: number;
}

export type GameState = Record<string, PlayerState>;