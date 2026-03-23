import React, { useEffect, useState } from 'react';
import { DaggerHitEffect } from './DaggerHitEffect';
import { WarriorCleaveEffect } from './WarriorCleaveEffect';
import { RangerSprintTrail } from './RangerSprintTrail';

/**
 * Этот компонент рендерит все эффекты один раз под землей при загрузке.
 * Это заставляет Three.js скомпилировать все шейдеры заранее, 
 * предотвращая фризы при первом использовании скиллов.
 */
export const EffectPrewarmer: React.FC = () => {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    // Убираем "прогревочные" эффекты через 1 секунду после загрузки
    const timer = setTimeout(() => {
      setVisible(false);
      console.log('Эффекты успешно прогреты в GPU');
    }, 1000);
    return () => clearTimeout(timer);
  }, []);

  if (!visible) return null;

  // Рендерим все эффекты далеко под картой
  const hidePos: [number, number, number] = [0, -100, 0];
  const hideRot = { x: 0, y: 0, z: 0, w: 1 };

  return (
    <group name="GPU_Prewarmer">
      <DaggerHitEffect position={hidePos} />
      <WarriorCleaveEffect position={{x: 0, y: -100, z: 0}} rotation={hideRot} />
      <RangerSprintTrail />
    </group>
  );
};
