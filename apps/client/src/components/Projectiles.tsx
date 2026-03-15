import { useEntities } from 'miniplex-react';
import { world } from '../ecs';

// Мини-компонент, который рисует все стрелы, существующие в ECS
export const Projectiles = () => {
  const { entities } = useEntities(world.with('isProjectile', 'position', 'velocity'));

  return (
    <>
      {entities.map((entity) => {
        // Вычисляем угол поворота стрелы, чтобы она летела "острием" вперед
        const angle = Math.atan2(entity.velocity.x, entity.velocity.z);

        return (
          <mesh
            key={entity.id}
            position={[entity.position.x, entity.position.y, entity.position.z]}
            rotation={[0, angle, 0]}
          >
            {/* Простая желтая палочка вместо стрелы */}
            <boxGeometry args={[0.05, 0.05, 0.8]} />
            <meshStandardMaterial color="yellow" />
          </mesh>
        );
      })}
    </>
  );
};
