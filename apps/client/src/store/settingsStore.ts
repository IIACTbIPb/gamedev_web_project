import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type KeyMap = {
  forward: string[];
  backward: string[];
  left: string[];
  right: string[];
  jump: string[];
  skill1: string[];
};

const defaultKeybinds: KeyMap = {
  forward: ['ArrowUp', 'KeyW'],
  backward: ['ArrowDown', 'KeyS'],
  left: ['ArrowLeft', 'KeyA'],
  right: ['ArrowRight', 'KeyD'],
  jump: ['Space'],
  skill1: ['KeyE'],
};

interface SettingsState {
  isNight: boolean;
  keybinds: KeyMap;
  isOpen: boolean; // Открыто ли меню настроек
  toggleMenu: () => void;
  setNightMode: (isNight: boolean) => void;
  setKeybind: (action: keyof KeyMap, code: string) => void;
  resetKeybinds: () => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      isNight: true,
      keybinds: defaultKeybinds,
      isOpen: false,

      toggleMenu: () => set((state) => ({ isOpen: !state.isOpen })),

      setNightMode: (isNight) => set({ isNight }),

      setKeybind: (action, code) =>
        set((state) => {
          // Заменяем вторую кнопку (обычно это WASD, а первую - стрелочки - не трогаем)
          // Либо просто перезаписываем весь массив нужной кнопкой
          return {
            keybinds: { ...state.keybinds, [action]: [code] },
          };
        }),

      resetKeybinds: () => set({ keybinds: defaultKeybinds }),
    }),
    {
      name: 'game-settings', // Ключ в localStorage браузера
      partialize: (state) => ({ isNight: state.isNight, keybinds: state.keybinds }), // Сохраняем только это
    },
  ),
);
