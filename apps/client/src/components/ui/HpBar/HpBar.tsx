import { Html } from '@react-three/drei';
import { ECS } from '../../../ecs';
import { useUIStore } from '../../../store/uiStore';
import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';

export const HpBar = ({ playerId }: { playerId: string }) => {
  const storeData = useUIStore((state) => state.playersHp[playerId]);
  const ecsPlayer = !storeData ? ECS.world.where((e) => e.id === playerId).first : null;

  // 1. Создаем ссылку на главный div вместо стейта
  const containerRef = useRef<HTMLDivElement>(null);

  const hp = storeData?.hp ?? ecsPlayer?.hp ?? 100;
  const maxHp = storeData?.maxHp ?? ecsPlayer?.maxHp ?? 100;
  const hpPercent = Math.max(0, (hp / maxHp) * 100);

  // 2. Меняем стили напрямую (60 раз в секунду это работает мгновенно и без лагов)
  useFrame(() => {
    if (!containerRef.current) return;

    const entity = ECS.world.where((e) => e.id === playerId).first;

    if (entity && entity.isInvisible) {
      // Скрываем от врагов полностью, для себя делаем 30% прозрачности
      containerRef.current.style.opacity = entity.isMe ? '0.3' : '0';
      // visibility: hidden отключает клики и рендер, когда элемент полностью прозрачен
      containerRef.current.style.visibility = entity.isMe ? 'visible' : 'hidden';
    } else {
      containerRef.current.style.opacity = '1';
      containerRef.current.style.visibility = 'visible';
    }
  });

  return (
    // <Html> всегда отрендерен, мы просто скрываем его содержимое
    <Html position={[0, 3.1, 0]} center transform sprite>
      <div
        ref={containerRef} // 3. Привязываем ref
        style={{
          width: '60px',
          height: '8px',
          backgroundColor: '#222',
          border: '1px solid #000',
          borderRadius: '4px',
          overflow: 'hidden',
          transition: 'opacity 0.2s ease-in-out', // 4. Плавно растворяем бар!
        }}
      >
        <div
          style={{
            width: `${hpPercent}%`,
            height: '100%',
            backgroundColor: hpPercent > 30 ? '#2ecc71' : '#e74c3c',
            transition: 'width 0.2s ease-out',
          }}
        />
      </div>
    </Html>
  );
};