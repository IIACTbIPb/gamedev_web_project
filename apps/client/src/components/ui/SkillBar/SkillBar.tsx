import { useSettingsStore, useUIStore } from '../../../store';
import styles from './SkillBar.module.css';

export const SkillBar = () => {
  const { keybinds } = useSettingsStore();

  // Достаем класс и таймер из стора
  const classType = useUIStore((state) => state.classType);
  const skill1Cooldown = useUIStore((state) => state.skill1Cooldown);

  if (classType !== 'Rogue') return null;

  const formatKey = (key: string) => key.replace('Key', '');

  // Проверяем, в откате ли сейчас навык
  const isCooldown = skill1Cooldown > 0;

  return (
    <div className={styles.bar}>
      {/* Базовая атака мыши */}
      <div className={`${styles.skillBox} ${styles.skillBoxDefault}`}>
        🔪
        <div className={`${styles.hotkey} ${styles.hotkeyDefault}`}>ЛКМ</div>
      </div>

      {/* Наш новый супер-скилл */}
      <div
        className={`${styles.skillBox} ${styles.skillBoxHighlighted}`}
        // Затемняем иконку через inline-стили, если скилл на перезарядке
        style={{ filter: isCooldown ? 'grayscale(100%) brightness(40%)' : 'none' }}
      >
        💥
        {/* Рисуем таймер, если идет откат */}
        {isCooldown && (
          <div
            style={{
              position: 'absolute',
              fontSize: '28px',
              fontWeight: 'bold',
              color: 'white',
              zIndex: 2,
            }}
          >
            {skill1Cooldown}
          </div>
        )}
        <div className={styles.hotkey}>{formatKey(keybinds.skill1[0])}</div>
      </div>
    </div>
  );
};
