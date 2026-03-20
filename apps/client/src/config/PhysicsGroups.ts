const GROUP_PLAYER = 0;
const GROUP_ENVIRONMENT = 1;
const GROUP_DECORATION = 2;

const MASK_PLAYER = 1 << GROUP_PLAYER;
const MASK_ENVIRONMENT = 1 << GROUP_ENVIRONMENT;
const MASK_DECORATION = 1 << GROUP_DECORATION;

const ALL = 0xFFFF;

export const PhysicsGroups = {
  ENVIRONMENT: (MASK_ENVIRONMENT << 16) | ALL,
  DECORATION: (MASK_DECORATION << 16) | ALL,
  PLAYER: (MASK_PLAYER << 16) | ALL,

  // === ИСПРАВЛЕНИЕ ЗДЕСЬ ===
  // Даем лучу принадлежность ALL (чтобы дома его "увидели"),
  // но фильтр поиска оставляем ТОЛЬКО на MASK_ENVIRONMENT (чтобы он игнорировал деревья).
  CAMERA_RAY: (ALL << 16) | MASK_ENVIRONMENT,
};