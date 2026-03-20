import { useState, useEffect } from 'react';
import { useSettingsStore, type KeyMap } from '@/store';
import styles from './SettingsMenu.module.css';

export const SettingsMenu = () => {
  const {
    isNight, keybinds, isOpen, toggleMenu, setNightMode, setKeybind, resetKeybinds,
    // ДОСТАЕМ НОВЫЕ ДАННЫЕ И МЕТОДЫ
    sensitivity, aimSensitivity, setSensitivity, setAimSensitivity
  } = useSettingsStore();

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

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <h2 className={styles.title}>Настройки</h2>

        {/* --- ГРАФИКА --- */}
        <h3>Графика</h3>
        <div className={styles.row}>
          <span>Время суток</span>
          <button
            className={`${styles.btn} ${isNight ? styles.btnNight : styles.btnDay}`}
            onClick={() => setNightMode(!isNight)}
          >
            {isNight ? '🌙 Ночь' : '☀️ День'}
          </button>
        </div>

        {/* --- КАМЕРА (НОВОЕ) --- */}
        <h3>Камера</h3>
        <div className={styles.row}>
          <span>Чувствительность ({sensitivity.toFixed(1)})</span>
          <input
            type="range"
            min="0.1"
            max="5.0"
            step="0.1"
            value={sensitivity}
            onChange={(e) => setSensitivity(parseFloat(e.target.value))}
          />
        </div>
        <div className={styles.row}>
          <span>Прицеливание ({aimSensitivity.toFixed(1)})</span>
          <input
            type="range"
            min="0.1"
            max="5.0"
            step="0.1"
            value={aimSensitivity}
            onChange={(e) => setAimSensitivity(parseFloat(e.target.value))}
          />
        </div>

        {/* --- УПРАВЛЕНИЕ --- */}
        <h3>Управление</h3>
        {(Object.keys(keybinds) as Array<keyof KeyMap>).map((action) => (
          <div key={action} className={styles.row}>
            <span className={styles.actionName}>{action}</span>
            <button
              className={`${styles.btn} ${listeningAction === action ? styles.btnListening : styles.btnDefault}`}
              onClick={() => setListeningAction(action)}
            >
              {listeningAction === action ? 'Нажмите клавишу...' : keybinds[action].join(', ')}
            </button>
          </div>
        ))}

        <div className={styles.footer}>
          <button className={`${styles.btn} ${styles.btnReset}`} onClick={resetKeybinds}>
            Сбросить
          </button>
          <button className={styles.btn} onClick={toggleMenu}>
            Закрыть
          </button>
        </div>
      </div>
    </div>
  );
};
