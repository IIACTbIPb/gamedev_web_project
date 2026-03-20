import { useProgress } from '@react-three/drei';
import { useEffect, useState, useMemo } from 'react';
import styles from './LoadingScreen.module.css';

// Список игровых подсказок или лора
const GAME_HINTS = [
  "Стрелы летят по дуге. Учитывайте гравитацию при выстреле на дальние дистанции.",
  "Режим прицеливания (ПКМ) снижает FOV и чувствительность мыши для точных выстрелов.",
  "Деревья в лесу можно использовать как укрытие от вражеских стрел.",
  "Настройки графики и управления доступны по клавише ESC.",
  "Яркие эффекты ударов помогают понять, куда именно попала ваша стрела.",
  "Камера автоматически прижимается к персонажу в узких пространствах.",
  "Нажмите Пробел, чтобы подпрыгнуть. Полезно для преодоления неровностей почвы.",
];

export const LoadingScreen = () => {
  const { active, progress, loaded, total } = useProgress();

  const [isFadingOut, setIsFadingOut] = useState(false);
  const [isHidden, setIsHidden] = useState(false);

  // Логика смены подсказок
  const [currentHintIndex, setCurrentHintIndex] = useState(0);
  const [hintKey, setHintKey] = useState(0); // Ключ для перезапуска анимации текста

  // Инициализация при старте
  useEffect(() => {
    // Выбираем случайную подсказку при первом запуске
    setCurrentHintIndex(Math.floor(Math.random() * GAME_HINTS.length));
  }, []);

  // Меняем подсказку каждые 5 секунд, пока идет загрузка
  useEffect(() => {
    if (!active) return; // Если загрузка кончилась, не меняем

    const interval = setInterval(() => {
      setCurrentHintIndex((prev) => (prev + 1) % GAME_HINTS.length);
      setHintKey(prev => prev + 1); // Меняем ключ, чтобы CSS-анимация сработала заново
    }, 5000);

    return () => clearInterval(interval);
  }, [active]);

  // Логика исчезновения
  useEffect(() => {
    if (!active && progress === 100) {
      // Даем полоске доехать до 100% перед началом исчезновения
      setTimeout(() => {
        setIsFadingOut(true);
        // Fade-out стал чуть дольше (0.8s), поэтому ждем дольше перед скрытием
        setTimeout(() => setIsHidden(true), 800);
      }, 200);
    }
  }, [active, progress]);

  // Генерируем несколько абстрактных фоновых кругов для атмосферы
  const bgCircles = useMemo(() => {
    return Array.from({ length: 4 }).map((_, i) => ({
      id: i,
      size: 200 + Math.random() * 300,
      top: Math.random() * 100 + '%',
      left: Math.random() * 100 + '%',
      delay: Math.random() * -15 + 's',
    }));
  }, []);

  if (isHidden) return null;

  return (
    <div className={`${styles.loadingContainer} ${isFadingOut ? styles.fadeOut : ''}`}>

      {/* Атмосферные фоновые круги */}
      {bgCircles.map(circle => (
        <div
          key={circle.id}
          className={styles.bgCircle}
          style={{
            width: `${circle.size}px`,
            height: `${circle.size}px`,
            top: circle.top,
            left: circle.left,
            animationDelay: circle.delay,
          }}
        />
      ))}

      <div className={styles.loadingBox}>
        <h1 className={styles.title}>PROJECT: ARCHER</h1>

        <div className={styles.progressBarBg}>
          {/* Полоска с анимацией перелива shimmer */}
          <div
            className={styles.progressBarFill}
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className={styles.stats}>
          <span className={styles.percentage}>{Math.round(progress)}%</span>
          <span>ЗАГРУЖЕНО ФАЙЛОВ: {loaded} / {total}</span>
        </div>

        {/* Секция подсказок */}
        <div className={styles.hintContainer}>
          <p key={hintKey} className={styles.hintText}>
            <span className={styles.hintPrefix}>Совет:</span>
            {GAME_HINTS[currentHintIndex]}
          </p>
        </div>
      </div>
    </div>
  );
};