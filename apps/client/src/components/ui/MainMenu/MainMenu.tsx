import { Canvas } from '@react-three/fiber';
import type { CharacterClass } from '@game/shared';
import styles from './MainMenu.module.css';
import { ModelPreview } from '../previews';

interface MainMenuProps {
  onSelectClass: (selectedClass: CharacterClass) => void;
}

const CLASSES_DATA: {
  type: CharacterClass;
  name: string;
  desc: string;
  modelUrl: string;
  modelScale: number;
  modelPos: [number, number, number];
}[] = [
  {
    type: 'Warrior',
    name: 'Воин',
    desc: 'Мастер ближнего боя. Крепкая броня и мощные удары мечом.',
    modelUrl: '/Warrior.gltf', // Убедись, что пути верные
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
];

export const MainMenu = ({ onSelectClass }: MainMenuProps) => {
  return (
    <div className={styles.overlay}>
      <h1 className={styles.title}>CHOOSE YOUR DESTINY</h1>

      <div className={styles.cardsContainer}>
        {CLASSES_DATA.map((char) => (
          <div
            key={char.type}
            // Динамический класс CSS: styles.card + styles.cardWarrior
            className={`${styles.card} ${styles[`card${char.type}`]}`}
            onClick={() => onSelectClass(char.type)}
          >
            {/* МИНИ-СЦЕНА 3D ВНУТРИ КАРТОЧКИ */}
            <div className={styles.modelContainer}>
              <Canvas camera={{ position: [0, 1, 3], fov: 50 }}>
                {/* Свет, необходимый для модели */}
                <ambientLight intensity={0.5} />
                <directionalLight position={[10, 10, 5]} intensity={1} castShadow />
                <spotLight position={[-10, 5, -5]} intensity={0.5} angle={0.3} />

                {/* Сама модель */}
                <ModelPreview
                  url={char.modelUrl}
                  scale={char.modelScale}
                  position={char.modelPos}
                />
              </Canvas>
            </div>

            {/* ТЕКСТОВОЕ ОПИСАНИЕ */}
            <div className={styles.cardClass}>{char.name}</div>
            <p className={styles.cardDesc}>{char.desc}</p>

            <div className={styles.selectText}>КЛИК ДЛЯ ВЫБОРА</div>
          </div>
        ))}
      </div>
    </div>
  );
};
