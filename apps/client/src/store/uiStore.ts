import type { CharacterClass } from '@game/shared';
import { create } from 'zustand';

interface UIState {
  hp: number;
  maxHp: number;
  classType: CharacterClass;
  isDead: boolean;
  killerId: string | null;
  setHp: (hp: number, maxHp: number) => void;
  setClassType: (classType: CharacterClass) => void;
  setDeathState: (isDead: boolean, killerId?: string | null) => void;

  playersHp: Record<string, { hp: number; maxHp: number }>;
  setPlayerHp: (id: string, hp: number, maxHp: number) => void;
  removePlayerHp: (id: string) => void;
}

export const useUIStore = create<UIState>((set) => ({
  hp: 100,
  maxHp: 100,
  classType: 'Ranger',
  setHp: (hp, maxHp) => set({ hp, maxHp }),
  setClassType: (classType) => set({ classType }),
  isDead: false,
  killerId: null,

  playersHp: {},
  // Обновляем ХП конкретного игрока, не трогая остальных
  setPlayerHp: (id, hp, maxHp) =>
    set((state) => ({
      playersHp: {
        ...state.playersHp,
        [id]: { hp, maxHp },
      },
    })),
  removePlayerHp: (id) =>
    set((state) => {
      const newPlayersHp = { ...state.playersHp };
      delete newPlayersHp[id]; // Безопасно удаляем свойство
      return { playersHp: newPlayersHp };
    }),
  setDeathState: (isDead, killerId = null) => set({ isDead, killerId }),
}));
