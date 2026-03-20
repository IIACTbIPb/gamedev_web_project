import type { AnimSettings, BaseAnimation } from "@game/shared";

export const BASE_ANIMATIONS: Record<BaseAnimation, AnimSettings> = {
  Idle: { loop: true, speed: 3, fade: 0.2 },
  Run: { loop: true, speed: 1, fade: 0.2 },
  Roll: { loop: false, speed: 1.5, fade: 0.05 },
  Death: { loop: false, speed: 1, fade: 0.2 },
  RecieveHit: { loop: false, speed: 1.5, fade: 0.05 },
  RecieveHit_2: { loop: false, speed: 1.5, fade: 0.05 },
};