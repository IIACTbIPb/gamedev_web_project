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
  
  cooldowns: Record<string, number>;
  startCooldown: (skillId: string, seconds: number) => void;
}

export const useUIStore = create<UIState>((set) => ({
  hp: 100,
  maxHp: 100,
  classType: 'Ranger',
  setHp: (hp, maxHp) => set({ hp, maxHp }),
  setClassType: (classType) => set({ classType }),
  isDead: false,
  killerId: null,
  
  cooldowns: {},
  startCooldown: (skillId, seconds) => {
    set((state) => ({
      cooldowns: { ...state.cooldowns, [skillId]: seconds },
    }));

    const interval = setInterval(() => {
      set((state) => {
        const current = state.cooldowns[skillId];
        if (current === undefined || current <= 1) {
          clearInterval(interval);
          const newCooldowns = { ...state.cooldowns };
          delete newCooldowns[skillId];
          return { cooldowns: newCooldowns }; // Таймер вышел!
        }
        return { cooldowns: { ...state.cooldowns, [skillId]: current - 1 } };
      });
    }, 1000);
  },

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
