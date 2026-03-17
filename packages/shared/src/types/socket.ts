import type { AnyAnimation, CharacterClass, GameState } from './player';

// === PAYLOADS (Аргументы, которые мы передаем) ===
export interface MovePayload {
	position: { x: number; y: number; z: number };
	rotation: [number, number, number, number];
	animation: AnyAnimation;
	isAiming: boolean;
}

export interface PlayerMovedPayload extends MovePayload {
	id: string;
}

export interface ProjectilePayload {
	id: string;
	ownerId?: string;
	isProjectile: boolean;
	position: { x: number; y: number; z: number };
	velocity: { x: number; y: number; z: number };
	lifeTime: number;
}

export interface ArrowHitPayload {
	arrowId: string;
	position: { x: number; y: number; z: number };
	targetId?: string;
	damage?: number;
	shooterId?: string;
}

export interface MeleeHitPayload {
	targetId: string;
	damage: number;
	shooterId?: string;
}

export interface HpChangedPayload {
	id: string;
	hp: number;
	maxHp: number;
}

export interface PlayerDiedPayload {
	victimId: string;
	killerId?: string | null;
}

export interface PlayerRespawnedPayload {
	id: string;
	position: { x: number; y: number; z: number };
}

// === ИНТЕРФЕЙСЫ SOCKET.IO ===

// События, которые КЛИЕНТ ОТПРАВЛЯЕТ, а СЕРВЕР СЛУШАЕТ
export interface ClientToServerEvents {
	joinGame: (classType: CharacterClass) => void;
	move: (data: MovePayload) => void;
	shoot: (data: ProjectilePayload) => void;
	arrowHit: (data: ArrowHitPayload) => void;
	meleeHit: (data: MeleeHitPayload) => void;
	respawn: () => void;
}

// События, которые СЕРВЕР ОТПРАВЛЯЕТ, а КЛИЕНТ СЛУШАЕТ
export interface ServerToClientEvents {
	gameState: (state: GameState) => void;
	playerMoved: (data: PlayerMovedPayload) => void;
	playerShot: (data: ProjectilePayload) => void;
	arrowHit: (data: ArrowHitPayload) => void;
	playerHpChanged: (data: HpChangedPayload) => void;
	playerDied: (data: PlayerDiedPayload) => void;
	playerRespawned: (data: PlayerRespawnedPayload) => void;
}