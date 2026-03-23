import { useState, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Float, PerspectiveCamera, Environment, ContactShadows, PresentationControls } from '@react-three/drei';
import { type CharacterClass, CLASS_BALANCE } from '@game/shared';
import * as THREE from 'three';
import styles from './MainMenu.module.css';
import { ModelPreview } from '../shared';

interface MainMenuProps {
  onSelectClass: (selectedClass: CharacterClass, playerName: string) => void;
}

const CLASSES_DATA: {
  type: CharacterClass;
  name: string;
  desc: string;
  modelUrl: string;
  color: string;
  skills: { name: string; icon: string }[];
}[] = [
    {
      type: 'Warrior',
      name: 'Воин',
      desc: 'Мастер ближнего боя. Крепкая броня и мощные удары мечом. Идеален для тех, кто любит быть в центре сражения.',
      modelUrl: '/Warrior.gltf',
      color: '#e74c3c',
      skills: [
        { name: 'Мощный клич', icon: '/warrior_skill1.png' },
      ]
    },
    {
      type: 'Ranger',
      name: 'Рейнджер',
      desc: 'Специалист дальнего боя. Высокая мобильность и меткая стрельба. Поражает врагов еще до того, как они успеют приблизиться.',
      modelUrl: '/Ranger.gltf',
      color: '#2ecc71',
      skills: [
        { name: 'Спринт', icon: '/ranger_skill.png' },
      ]
    },
    {
      type: 'Rogue',
      name: 'Разбойник',
      desc: 'Мастер скрытности и неожиданных атак. Быстрый и смертоносный. Наносит критический урон из тени.',
      modelUrl: '/Rogue.gltf',
      color: '#bb21cc',
      skills: [
        { name: 'Удар кинжалом', icon: '/rogue_skill.png' },
        { name: 'Невидимость', icon: '/rogue_skill2.png' },
      ]
    },
  ];

interface CarouselProps {
  virtualIndex: number;
}

const Carousel = ({ virtualIndex }: CarouselProps) => {
  const groupRef = useRef<THREE.Group>(null);
  const { viewport } = useThree();

  // Теперь карусель центрирована в своем контейнере, поэтому расчеты проще
  const responsiveScale = Math.min(viewport.width / 10, 0.5);
  const radius = 1.8;

  const count = CLASSES_DATA.length;
  const angleStep = (Math.PI * 2) / count;
  const selectedIndex = ((virtualIndex % count) + count) % count;

  useFrame((_state, delta) => {
    if (groupRef.current) {
      const targetRotation = -virtualIndex * angleStep;
      groupRef.current.rotation.y = THREE.MathUtils.lerp(
        groupRef.current.rotation.y,
        targetRotation,
        delta * 5
      );
    }
  });

  return (
    <group position={[0, 1.5, 0]}> {/* Теперь x=0, так как Canvas смещен через CSS */}
      <group ref={groupRef}>
        {CLASSES_DATA.map((char, i) => {
          const angle = i * angleStep;
          const isActive = i === selectedIndex;

          const modelContent = (
            <Float speed={2} rotationIntensity={0.2} floatIntensity={0.2}>
              <ModelPreview
                url={char.modelUrl}
                scale={responsiveScale}
                position={[0, -1, 0]}
              />
            </Float>
          );

          return (
            <group
              key={char.type}
              position={[
                Math.sin(angle) * radius,
                0,
                Math.cos(angle) * radius
              ]}
              rotation={[0, angle, 0]}
            >
              {isActive ? (
                <PresentationControls
                  global={true}
                  cursor={true}
                  speed={2}
                  polar={[0, 0]}
                  azimuth={[-Infinity, Infinity]}
                >
                  {modelContent}
                </PresentationControls>
              ) : (
                modelContent
              )}
            </group>
          );
        })}
      </group>

      <ContactShadows
        position={[0, -0.2, 0]}
        opacity={0.4}
        scale={10}
        blur={2.5}
        far={2}
      />
    </group>
  );
};

// Максимальные значения для нормализации прогресс-баров
const MAX_STATS = {
  hp: 300,
  speed: 10,
  damage: 50,
};

export const MainMenu = ({ onSelectClass }: MainMenuProps) => {
  const [virtualIndex, setVirtualIndex] = useState(0);
  const [nickname, setNickname] = useState('');

  const selectedIndex = ((virtualIndex % CLASSES_DATA.length) + CLASSES_DATA.length) % CLASSES_DATA.length;
  const activeChar = CLASSES_DATA[selectedIndex];
  const stats = CLASS_BALANCE[activeChar.type];

  const handleNext = () => setVirtualIndex(prev => prev + 1);
  const handlePrev = () => setVirtualIndex(prev => prev - 1);

  const handleStart = () => {
    const finalName = nickname.trim() !== ''
      ? nickname.trim()
      : `Player_${Math.floor(Math.random() * 9999)}`;
    onSelectClass(activeChar.type, finalName);
  };

  return (
    <div className={styles.overlay}>
      <div className={styles.canvasContainer}>
        <Canvas shadows gl={{ antialias: true }} dpr={[1, 2]}>
          <PerspectiveCamera makeDefault position={[0, 1.1, 6]} fov={35} />
          <ambientLight intensity={0.7} />
          <spotLight position={[10, 10, 10]} angle={0.15} penumbra={1} intensity={2} castShadow />
          <pointLight position={[0, 2, 2]} intensity={1.5} />

          <Carousel virtualIndex={virtualIndex} />

          <Environment preset="city" />
        </Canvas>
      </div>

      <div className={styles.uiContainer}>
        <div className={styles.topBar}>
          <h1 className={styles.title}>ВЫБОР ГЕРОЯ</h1>
        </div>

        <div className={styles.mainContent}>
          <div className={styles.characterInfo} key={activeChar.type}>
            <div className={styles.infoBadge}>КЛАСС</div>
            <h2 className={styles.charName} style={{ color: activeChar.color }}>
              {activeChar.name}
            </h2>
            <div className={styles.divider} style={{ backgroundColor: activeChar.color }} />
            <p className={styles.charDesc}>{activeChar.desc}</p>

            <div className={styles.statsContainer}>
              {/* HP Bar */}
              <div className={styles.statRow}>
                <div className={styles.statHeader}>
                  <div className={styles.statLabel}>🛡️ ЗДОРОВЬЕ</div>
                  <div className={styles.statValue}>{stats.baseHp}</div>
                </div>
                <div className={styles.barBackground}>
                  <div
                    className={styles.barFill}
                    style={{
                      width: `${(stats.baseHp / MAX_STATS.hp) * 100}%`,
                      backgroundColor: '#e74c3c'
                    }}
                  />
                </div>
              </div>

              {/* Speed Bar */}
              <div className={styles.statRow}>
                <div className={styles.statHeader}>
                  <div className={styles.statLabel}>🏃 СКОРОСТЬ</div>
                  <div className={styles.statValue}>{stats.baseSpeed}</div>
                </div>
                <div className={styles.barBackground}>
                  <div
                    className={styles.barFill}
                    style={{
                      width: `${(stats.baseSpeed / MAX_STATS.speed) * 100}%`,
                      backgroundColor: '#2ecc71'
                    }}
                  />
                </div>
              </div>

              {/* Damage Bar */}
              <div className={styles.statRow}>
                <div className={styles.statHeader}>
                  <div className={styles.statLabel}>⚔️ УРОН</div>
                  <div className={styles.statValue}>{stats.primaryDamage}</div>
                </div>
                <div className={styles.barBackground}>
                  <div
                    className={styles.barFill}
                    style={{
                      width: `${(stats.primaryDamage / MAX_STATS.damage) * 100}%`,
                      backgroundColor: '#f1c40f'
                    }}
                  />
                </div>
              </div>

              {/* Difficulty */}
              <div className={styles.difficultyRow}>
                <span>СЛОЖНОСТЬ</span>
                <div className={styles.difficultyDots}>
                  {[1, 2, 3, 4, 5].map(d => (
                    <div
                      key={d}
                      className={styles.dot}
                      style={{ backgroundColor: d <= (activeChar.type === 'Rogue' ? 5 : activeChar.type === 'Ranger' ? 3 : 2) ? activeChar.color : '#333' }}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Skills Section */}
            <div className={styles.skillsSection}>
              <div className={styles.skillsTitle}>Навыки</div>
              <div className={styles.skillsList}>
                {activeChar.skills.map((skill, idx) => (
                  <div key={idx} className={styles.skillItem}>
                    <div className={styles.skillIconWrapper} style={{ boxShadow: `0 0 15px ${activeChar.color}33` }}>
                      <img src={skill.icon} alt={skill.name} className={styles.skillIcon} />
                    </div>
                    <span className={styles.skillName}>{skill.name}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className={styles.controlsWrapper}>
          <div className={styles.controls}>
            <button className={styles.navButton} onClick={handlePrev}>
              &larr;
            </button>

            <div className={styles.inputWrapper}>
              <input
                type="text"
                className={styles.nameInput}
                placeholder="ИМЯ ГЕРОЯ"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                maxLength={16}
                autoComplete="off"
              />
              <button className={styles.startButton} onClick={handleStart}>
                В БОЙ!
              </button>
            </div>

            <button className={styles.navButton} onClick={handleNext}>
              &rarr;
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
