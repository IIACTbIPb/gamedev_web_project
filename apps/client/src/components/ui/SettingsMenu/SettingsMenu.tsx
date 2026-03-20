import { useState, useEffect } from 'react';
import { useSettingsStore, type KeyMap } from '@/store';
import styles from './SettingsMenu.module.css';

export const SettingsMenu = () => {
  const { isNight, keybinds, isOpen, toggleMenu, setNightMode, setKeybind, resetKeybinds } =
    useSettingsStore();

  // Какую кнопку мы сейчас пытаемся переназначить?
  const [listeningAction, setListeningAction] = useState<keyof KeyMap | null>(null);

  // Ловим нажатие клавиши, если мы находимся в режиме "ожидания"
  useEffect(() => {
    if (!listeningAction) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      e.preventDefault();

      // Если игрок нажал Esc, просто отменяем режим бинда и ничего не сохраняем
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
      // Срабатывает только если нажали Esc и мы НЕ ждем ввода новой кнопки
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

        {/* --- УПРАВЛЕНИЕ --- */}
        <h3>Управление</h3>
        {(Object.keys(keybinds) as Array<keyof KeyMap>).map((action) => (
          <div key={action} className={styles.row}>
            <span className={styles.actionName}>{action}</span>
            <button
              className={`${styles.btn} ${listeningAction === action ? styles.btnListening : styles.btnDefault
                }`}
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
