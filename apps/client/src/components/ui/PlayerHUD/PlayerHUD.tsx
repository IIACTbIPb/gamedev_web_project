import styles from './PlayerHUD.module.css';
import { useUIStore } from '../../../store/uiStore';

export const PlayerHUD = () => {
  const hp = useUIStore((state) => state.hp);
  const maxHp = useUIStore((state) => state.maxHp);
  const classType = useUIStore((state) => state.classType);

  const hpPercent = Math.max(0, (hp / maxHp) * 100);

  return (
    <div className={styles.overlay}>
      <div className={styles.title}>
        <span>{classType}</span>
        <span>
          {hp} / {maxHp}
        </span>
      </div>

      <div
        className={styles.healthBar}
        style={{
          width: '100%',
          height: '24px',
          backgroundColor: '#1a1a1a',
          border: '2px solid #000',
          borderRadius: '4px',
          overflow: 'hidden',
        }}
      >
        <div
          className={styles.healthBarFill}
          style={{
            width: `${hpPercent}%`,
            height: '100%',
            backgroundColor: hpPercent > 30 ? '#2ecc71' : '#e74c3c',
            transition: 'width 0.2s ease-out, background-color 0.3s',
          }}
        />
      </div>
    </div>
  );
};
