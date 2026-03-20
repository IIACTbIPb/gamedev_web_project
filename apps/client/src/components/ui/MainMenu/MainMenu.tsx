import { useState } from 'react'; // <-- ДОБАВИЛИ ИМПОРТ
import { Canvas } from '@react-three/fiber';
import type { CharacterClass } from '@game/shared';
import styles from './MainMenu.module.css';
import { ModelPreview } from '../shared';

interface MainMenuProps {
  // <-- ОБНОВИЛИ ПРОПС: теперь передаем класс и имя
  onSelectClass: (selectedClass: CharacterClass, playerName: string) => void;
}

const CLASSES_DATA: {
  type: CharacterClass;
  name: string;
  desc: string;
  modelUrl: string;
  modelScale: number;
  modelPos: [number, number, number];
}[] = [
    // ... (Твои данные классов остаются без изменений)
    {
      type: 'Warrior',
      name: 'Воин',
      desc: 'Мастер ближнего боя. Крепкая броня и мощные удары мечом.',
      modelUrl: '/Warrior.gltf',
      modelScale: 0.8,
      modelPos: [0, -1.5, 0],
    },
    {
      type: 'Ranger',
      name: 'Рейнджер',
      desc: 'Специалист дальнего боя. Высокая мобильность и меткая стрельба.',
      modelUrl: '/Ranger.gltf',
      modelScale: 0.8,
      modelPos: [0, -1.5, 0],
    },
    {
      type: 'Rogue',
      name: 'Разбойник',
      desc: 'Мастер скрытности и неожиданных атак',
      modelUrl: '/Rogue.gltf',
      modelScale: 0.8,
      modelPos: [0, -1.5, 0],
    },
  ];

export const MainMenu = ({ onSelectClass }: MainMenuProps) => {
  // <-- ДОБАВИЛИ СТЕЙТ ДЛЯ ИМЕНИ
  const [nickname, setNickname] = useState('');

  // <-- ОБРАБОТЧИК КЛИКА ПО КАРТОЧКЕ
  const handleCardClick = (charType: CharacterClass) => {
    // Если игрок ничего не ввел, даем ему случайное имя
    const finalName = nickname.trim() !== ''
      ? nickname.trim()
      : `Player_${Math.floor(Math.random() * 9999)}`;

    onSelectClass(charType, finalName);
  };

  return (
    <div className={styles.overlay}>
      <h1 className={styles.title}>CHOOSE YOUR DESTINY</h1>

      {/* === НОВОЕ КРАСИВОЕ ПОЛЕ ВВОДА === */}
      <div className={styles.inputContainer}>
        <input
          type="text"
          className={styles.nameInput}
          placeholder="Введи свой никнейм..."
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          maxLength={16} // Ограничиваем длину, чтобы ХП-бар не сломался
          autoComplete="off"
          spellCheck="false"
        />
      </div>

      <div className={styles.cardsContainer}>
        {CLASSES_DATA.map((char) => (
          <div
            key={char.type}
            className={`${styles.card} ${styles[`card${char.type}`]}`}
            // <-- ИСПОЛЬЗУЕМ НАШ НОВЫЙ ОБРАБОТЧИК
            onClick={() => handleCardClick(char.type)}
          >
            <div className={styles.modelContainer}>
              <Canvas camera={{ position: [0, 1, 3], fov: 50 }}>
                <ambientLight intensity={0.5} />
                <directionalLight position={[10, 10, 5]} intensity={1} castShadow />
                <spotLight position={[-10, 5, -5]} intensity={0.5} angle={0.3} />

                <ModelPreview
                  url={char.modelUrl}
                  scale={char.modelScale}
                  position={char.modelPos}
                />
              </Canvas>
            </div>

            <div className={styles.cardClass}>{char.name}</div>
            <p className={styles.cardDesc}>{char.desc}</p>

            <div className={styles.selectText}>КЛИК ДЛЯ ВЫБОРА</div>
          </div>
        ))}
      </div>
    </div>
  );
};