import { useEffect, useState } from 'react';

export const Crosshair = () => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onAimStart = () => setVisible(true);
    const onAimEnd = () => setVisible(false);

    window.addEventListener('aimStart', onAimStart);
    window.addEventListener('aimEnd', onAimEnd);

    return () => {
      window.removeEventListener('aimStart', onAimStart);
      window.removeEventListener('aimEnd', onAimEnd);
    };
  }, []);

  if (!visible) return null;

  return (
    <div
      style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: '24px',
        height: '24px',
        pointerEvents: 'none', // Чтобы клики проходили сквозь прицел в игру
        zIndex: 50,
      }}
    >
      {/* Простой CSS-крестик */}
      <div
        style={{
          position: 'absolute',
          top: '11px',
          left: 0,
          width: '24px',
          height: '2px',
          background: 'rgba(255,255,255,0.8)',
        }}
      />
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: '11px',
          width: '2px',
          height: '24px',
          background: 'rgba(255,255,255,0.8)',
        }}
      />
      {/* Красная точка в центре */}
      <div
        style={{
          position: 'absolute',
          top: '10px',
          left: '10px',
          width: '4px',
          height: '4px',
          background: '#e74c3c',
          borderRadius: '50%',
        }}
      />
    </div>
  );
};
