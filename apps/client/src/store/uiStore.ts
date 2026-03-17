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
  skill1Cooldown: number;
  startSkill1Cooldown: (seconds: number) => void;
}

export const useUIStore = create<UIState>((set) => ({
  hp: 100,
  maxHp: 100,
  classType: 'Ranger',
  setHp: (hp, maxHp) => set({ hp, maxHp }),
  setClassType: (classType) => set({ classType }),
  isDead: false,
  killerId: null,
  skill1Cooldown: 0,
  startSkill1Cooldown: (seconds) => {
    set({ skill1Cooldown: seconds });

    // Запускаем счетчик, который будет каждую секунду уменьшать значение
    const interval = setInterval(() => {
      set((state) => {
        if (state.skill1Cooldown <= 1) {
          clearInterval(interval);
          return { skill1Cooldown: 0 }; // Таймер вышел!
        }
        return { skill1Cooldown: state.skill1Cooldown - 1 };
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
