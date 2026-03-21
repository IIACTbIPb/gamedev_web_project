import type { CharacterClass, ClassStats } from "../types/player";

export const CLASS_BALANCE: Record<CharacterClass, ClassStats> = {
  Warrior: {
    baseHp: 250,
    baseSpeed: 5,
    primaryDamage: 35,
    skill1: { damage: 60, cooldown: 8, duration: 0 }, // Heavy Cleave
    skill2: { damage: 0, cooldown: 15, duration: 5 }, // Заглушка для будущего скилла
  },
  Rogue: {
    baseHp: 120,
    baseSpeed: 7,
    primaryDamage: 15,
    skill1: { damage: 55, cooldown: 15, duration: 0 },  // Dagger Strike
    skill2: { damage: 0, cooldown: 30, duration: 10 },  // Invisibility
  },
  Ranger: {
    baseHp: 100,
    baseSpeed: 6,
    primaryDamage: 25,
    skill1: { damage: 0, cooldown: 15, duration: 10, speedBuff: 13 }, // Sprint
    skill2: { damage: 0, cooldown: 20, duration: 0 },  // Заглушка
  }
};