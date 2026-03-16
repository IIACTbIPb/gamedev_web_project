import { useUIStore } from '../../../store/uiStore';
import { socket } from '../../../socket';
import styles from './DeathScreen.module.css';

export const DeathScreen = () => {
  const isDead = useUIStore((state) => state.isDead);
  const killerId = useUIStore((state) => state.killerId);

  if (!isDead) return null;

  const handleRespawn = () => {
    socket.emit('respawn');
    useUIStore.getState().setDeathState(false); // Прячем экран
  };

  return (
    <div className={styles.overlay}>
      <h1 className={styles.title}>Вы погибли</h1>

      <p className={styles.subtitle}>
        Вас убил: <span className={styles.killerName}>{killerId || 'Неизвестный'}</span>
      </p>

      <button className={styles.respawnButton} onClick={handleRespawn}>
        Возродиться
      </button>
    </div>
  );
};
