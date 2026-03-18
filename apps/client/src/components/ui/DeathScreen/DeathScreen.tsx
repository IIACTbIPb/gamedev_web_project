import { useUIStore } from '../../../store/uiStore';
import { socket } from '../../../socket';
import { ECS } from '../../../ecs'; // <-- ДОБАВИЛИ ИМПОРТ ECS
import styles from './DeathScreen.module.css';

export const DeathScreen = () => {
  const isDead = useUIStore((state) => state.isDead);
  const killerId = useUIStore((state) => state.killerId);

  if (!isDead) return null;

  // Ищем сущность убийцы в нашем 3D-мире
  const killer = ECS.world.where((e) => e.id === killerId).first;

  // Достаем его имя, или класс. Если он уже вышел из игры — пишем "Неизвестный"
  const killerName = killer?.name || killer?.classType || 'Неизвестный';

  const handleRespawn = () => {
    socket.emit('respawn');
    useUIStore.getState().setDeathState(false); // Прячем экран
  };

  return (
    <div className={styles.overlay}>
      <div className={styles.content}>
        <h1 className={styles.title}>ВЫ ПОГИБЛИ</h1>

        <p className={styles.subtitle}>
          Смертельный удар нанес: <span className={styles.killerName}>{killerName}</span>
        </p>

        <button className={styles.respawnButton} onClick={handleRespawn}>
          ВОЗРОДИТЬСЯ
        </button>
      </div>
    </div>
  );
};