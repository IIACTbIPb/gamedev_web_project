import { useEntities } from 'miniplex-react';
import { DaggerHitEffect } from './DaggerHitEffect';
import { WarriorCleaveEffect } from './WarriorCleaveEffect';
import { RangerSprintTrail } from './RangerSprintTrail';
import { EffectPrewarmer } from './EffectPrewarmer';
import { ECS } from '@/ecs';

export const Effects = () => {
  const { entities } = useEntities(ECS.world.with('isEffect', 'effectType', 'position'));

  return (
    <>
      <EffectPrewarmer />
      {entities.map((entity) => {
        if (entity.effectType === 'DaggerHit') {
          return (
            <DaggerHitEffect
              key={entity.id}
              position={[entity.position.x, entity.position.y, entity.position.z]}
              onFinish={() => {
                ECS.world.remove(entity);
              }}
            />
          );
        }
        if (entity.effectType === 'WarriorCleave') {
          return (
            <WarriorCleaveEffect
              key={entity.id}
              position={entity.position}
              // Для воина нам важно вращение, чтобы пустить волну вперед!
              rotation={entity.rotation || { x: 0, y: 0, z: 0, w: 1 }}
              onFinish={() => {
                ECS.world.remove(entity);
              }}
            />
          );
        }
        return null;
      })}
      <RangerSprintTrail />
    </>
  );
};
