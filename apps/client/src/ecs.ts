import type { CharacterClass } from '@game/shared';
import type { RapierRigidBody } from '@react-three/rapier';
import { World } from 'miniplex';
import type { Object3D } from 'three';

// Описываем все возможные компоненты в игре
export type Entity = {
  id?: string;
  isMe?: boolean;
  position?: { x: number; y: number; z: number };

  // Добавим новый компонент чисто для клиента
  rotationSpeed?: number;

  // Ссылка на реальный 3D-объект Three.js, чтобы системы могли его двигать
  threeObject?: Object3D;
  rigidBody?: RapierRigidBody; // Ссылка на физическое тело из Rapier
  currentAnimation?: string;
  actionTimer?: number;

  // === НОВЫЕ ПОЛЯ ДЛЯ СТРЕЛ ===
  isProjectile?: boolean;
  velocity?: { x: number; y: number; z: number };
  lifeTime?: number; // Сколько секунд живет стрела

  // === НОВОЕ СВОЙСТВО ДЛЯ КЛАССОВ ===
  classType?: CharacterClass;
};

// Создаем и экспортируем наш ECS-мир
export const world = new World<Entity>();
