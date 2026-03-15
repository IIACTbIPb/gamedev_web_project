import { useFrame } from '@react-three/fiber';
import { world } from '../ecs';

// Выбираем все сущности, которые являются снарядами
const projectiles = world.with('isProjectile', 'position', 'velocity', 'lifeTime');

export const ProjectileSystem = () => {
  useFrame((_, delta) => {
    for (const entity of projectiles) {
      // 1. Уменьшаем время жизни
      entity.lifeTime -= delta;

      // 2. Если время вышло - удаляем стрелу из мира
      if (entity.lifeTime <= 0) {
        world.remove(entity);
        continue;
      }

      // 3. Двигаем стрелу по её вектору скорости
      entity.position.x += entity.velocity.x * delta;
      entity.position.y += entity.velocity.y * delta;
      entity.position.z += entity.velocity.z * delta;
    }
  });

  return null;
};
