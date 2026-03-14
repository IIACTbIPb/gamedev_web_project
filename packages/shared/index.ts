export interface PlayerState {
  id: string;
  position: { x: number; y: number; z: number };
}

export type GameState = Record<string, PlayerState>;