import { useSettingsStore, useUIStore } from '@/store';
import { CLASSES_CONFIG } from '@/classesConfig';
import styles from './SkillBar.module.css';

export const SkillBar = () => {
  const { keybinds } = useSettingsStore();
  const classType = useUIStore((state) => state.classType);
  const cooldowns = useUIStore((state) => state.cooldowns);

  const formatKey = (key: string) => key.replace('Key', '');

  const classLogic = CLASSES_CONFIG[classType];
  const skills = classLogic?.skills || [];

  return (
    <div className={styles.bar}>
      {/* Базовая атака мыши */}
      <div className={`${styles.skillBox} ${styles.skillBoxDefault}`}>
        🔪
        <div className={`${styles.hotkey} ${styles.hotkeyDefault}`}>ЛКМ</div>
      </div>

      {/* Динамические скиллы */}
      {skills.map((skill) => {
        const cooldown = cooldowns[skill.id];
        const isCooldown = cooldown !== undefined && cooldown > 0;
        const keyMap = keybinds[skill.id as keyof typeof keybinds];
        const keyName = keyMap && keyMap.length > 0 ? formatKey(keyMap[0]) : '?';

        return (
          <div
            key={skill.id}
            className={`${styles.skillBox} ${styles.skillBoxHighlighted}`}
            style={{ filter: isCooldown ? 'grayscale(100%) brightness(40%)' : 'none' }}
          >
            {skill.icon}
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
                {cooldown}
              </div>
            )}
            <div className={styles.hotkey}>{keyName}</div>
          </div>
        );
      })}
    </div>
  );
};
