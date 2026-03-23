import { useState, useEffect } from 'react';
import { useSettingsStore, useUIStore, type KeyMap } from '@/store';
import styles from './SettingsMenu.module.css';

type TabType = 'gameplay' | 'graphics' | 'controls';

export const SettingsMenu = () => {
  const {
    isNight, keybinds, isOpen, toggleMenu, setNightMode, setKeybind, resetKeybinds,
    sensitivity, aimSensitivity, setSensitivity, setAimSensitivity
  } = useSettingsStore();

  const { setIsJoined } = useUIStore();
  const [activeTab, setActiveTab] = useState<TabType>('gameplay');
  const [listeningAction, setListeningAction] = useState<keyof KeyMap | null>(null);

  useEffect(() => {
    if (!listeningAction) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      e.preventDefault();
      if (e.code === 'Escape') {
        setListeningAction(null);
        return;
      }
      setKeybind(listeningAction, e.code);
      setListeningAction(null);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [listeningAction, setKeybind]);

  useEffect(() => {
    const handleEscToggle = (e: KeyboardEvent) => {
      if (e.code === 'Escape' && !listeningAction) {
        toggleMenu();
      }
    };

    window.addEventListener('keydown', handleEscToggle);
    return () => window.removeEventListener('keydown', handleEscToggle);
  }, [listeningAction, toggleMenu]);

  if (!isOpen) return null;

  const handleExitToMenu = () => {
    import('@/socket').then(({ socket }) => {
      socket.disconnect();
      setIsJoined(false);
      toggleMenu();
    });
  };

  const formatKey = (keys: string[]) => {
    return keys.map(k => k.replace('Key', '').replace('Arrow', '↑')).join(', ');
  };

  const actionLabels: Record<keyof KeyMap, string> = {
    forward: 'Вперед',
    backward: 'Назад',
    left: 'Влево',
    right: 'Вправо',
    jump: 'Прыжок',
    skill1: 'Навык 1',
    skill2: 'Навык 2',
  };

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <div className={styles.header}>
          <h2 className={styles.title}>Настройки</h2>
          <button className={styles.btn} onClick={toggleMenu}>✕</button>
        </div>

        <div className={styles.tabs}>
          <button 
            className={`${styles.tab} ${activeTab === 'gameplay' ? styles.tabActive : ''}`}
            onClick={() => setActiveTab('gameplay')}
          >
            Геймплей
          </button>
          <button 
            className={`${styles.tab} ${activeTab === 'graphics' ? styles.tabActive : ''}`}
            onClick={() => setActiveTab('graphics')}
          >
            Графика
          </button>
          <button 
            className={`${styles.tab} ${activeTab === 'controls' ? styles.tabActive : ''}`}
            onClick={() => setActiveTab('controls')}
          >
            Управление
          </button>
        </div>

        <div className={styles.content}>
          {activeTab === 'gameplay' && (
            <div className={styles.section}>
              <div className={styles.sectionTitle}>🖱️ Чувствительность</div>
              <div className={styles.row}>
                <span className={styles.label}>Общая чувствительность</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                  <input
                    type="range"
                    min="0.1"
                    max="5.0"
                    step="0.1"
                    className={styles.slider}
                    value={sensitivity}
                    onChange={(e) => setSensitivity(parseFloat(e.target.value))}
                  />
                  <span className={styles.value}>{sensitivity.toFixed(1)}</span>
                </div>
              </div>
              <div className={styles.row}>
                <span className={styles.label}>Прицеливание</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                  <input
                    type="range"
                    min="0.1"
                    max="5.0"
                    step="0.1"
                    className={styles.slider}
                    value={aimSensitivity}
                    onChange={(e) => setAimSensitivity(parseFloat(e.target.value))}
                  />
                  <span className={styles.value}>{aimSensitivity.toFixed(1)}</span>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'graphics' && (
            <div className={styles.section}>
              <div className={styles.sectionTitle}>🌍 Окружение</div>
              <div className={styles.row}>
                <span className={styles.label}>Время суток</span>
                <button
                  className={`${styles.btn} ${isNight ? styles.btnNight : styles.btnDay}`}
                  onClick={() => setNightMode(!isNight)}
                >
                  {isNight ? '🌙 Ночь' : '☀️ День'}
                </button>
              </div>
            </div>
          )}

          {activeTab === 'controls' && (
            <div className={styles.section}>
              <div className={styles.sectionTitle}>⌨️ Переназначение клавиш</div>
              {(Object.keys(keybinds) as Array<keyof KeyMap>).map((action) => (
                <div key={action} className={styles.row}>
                  <span className={styles.label}>{actionLabels[action]}</span>
                  <button
                    className={`${styles.btn} ${listeningAction === action ? styles.btnListening : ''}`}
                    onClick={() => setListeningAction(action)}
                  >
                    {listeningAction === action ? '???' : <span className={styles.keyLabel}>{formatKey(keybinds[action])}</span>}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className={styles.footer}>
          <button className={`${styles.btn} ${styles.btnExit}`} onClick={handleExitToMenu}>
            ↩ Выйти в меню
          </button>
          <button className={`${styles.btn} ${styles.btnReset}`} onClick={resetKeybinds}>
            Сброс
          </button>
          <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={toggleMenu}>
            Применить
          </button>
        </div>
      </div>
    </div>
  );
};
