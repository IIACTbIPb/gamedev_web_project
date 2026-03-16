import { Html } from '@react-three/drei';
import { ECS } from '../../../ecs';
import { useUIStore } from '../../../store/uiStore';

export const HpBar = ({ playerId }: { playerId: string }) => {
  const storeData = useUIStore((state) => state.playersHp[playerId]);
  const ecsPlayer = !storeData ? ECS.world.where((e) => e.id === playerId).first : null;

  const hp = storeData?.hp ?? ecsPlayer?.hp ?? 100;
  const maxHp = storeData?.maxHp ?? ecsPlayer?.maxHp ?? 100;

  const hpPercent = Math.max(0, (hp / maxHp) * 100);

  return (
    <Html position={[0, 3.1, 0]} center transform sprite>
      <div
        style={{
          width: '60px',
          height: '8px',
          backgroundColor: '#222',
          border: '1px solid #000',
          borderRadius: '4px',
          overflow: 'hidden',
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
