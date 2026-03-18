import * as THREE from 'three';
import React, { useRef, useMemo, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Instances, Instance } from '@react-three/drei';

// Количество частиц в одном всплеске
const PARTICLE_COUNT = 150;
const LIGHTNING_COUNT = 5;

// Вспомогательный класс для управления состоянием одной частицы
class ParticleData {
  velocity: THREE.Vector3;
  life: number;
  maxLife: number;
  size: number;
  colorOffset: number;

  constructor() {
    // Взрыв во все стороны с акцентом вперед (по оси Z мы передаем вращение, так что вперед это Z)
    this.velocity = new THREE.Vector3(
      (Math.random() - 0.5) * 15,
      (Math.random() - 0.5) * 15,
      (Math.random() - 0.5) * 15,
    );
    // Делаем жизнь дольше: от 0.8 до 2.0 секунд
    this.maxLife = 0.8 + Math.random() * 1.2;
    this.life = this.maxLife;
    this.size = 0.15 + Math.random() * 0.3;
    this.colorOffset = Math.random();
  }

  update(delta: number) {
    this.life -= delta;
    // Трение: резкое замедление к концу
    this.velocity.multiplyScalar(0.92);
  }
}

// Вспомогательный класс для молний
class LightningData {
  rotation: THREE.Euler;
  scale: number;
  life: number;
  maxLife: number;
  speed: number;

  constructor() {
    this.rotation = new THREE.Euler(
      Math.random() * Math.PI,
      Math.random() * Math.PI,
      Math.random() * Math.PI,
    );
    this.scale = 1 + Math.random() * 2;
    this.maxLife = 0.3 + Math.random() * 0.4; // Молнии живут очень мало
    this.life = this.maxLife;
    this.speed = (Math.random() - 0.5) * 10;
  }

  update(delta: number) {
    this.life -= delta;
    this.rotation.z += this.speed * delta;
  }
}

interface DaggerHitEffectProps {
  position: [number, number, number]; // Где произошел удар
  onFinish?: () => void; // Что сделать, когда эффект погаснет
}

export const DaggerHitEffect: React.FC<DaggerHitEffectProps> = ({ position, onFinish }) => {
  const particles = useMemo(() => Array.from({ length: PARTICLE_COUNT }, () => new ParticleData()), []);
  const lightnings = useMemo(() => Array.from({ length: LIGHTNING_COUNT }, () => new LightningData()), []);

  const [active, setActive] = useState(true);
  const totalLife = useRef(2.5); // Увеличили общее время жизни эффекта

  const instancesApi = useRef<THREE.InstancedMesh>(null);
  const lightningApi = useRef<THREE.InstancedMesh>(null);
  const lightRef = useRef<THREE.PointLight>(null);

  useFrame((_state, delta) => {
    if (!active) return;

    totalLife.current -= delta;
    if (totalLife.current <= 0) {
      setActive(false);
      onFinish?.();
      return;
    }

    const tempMatrix = new THREE.Matrix4();
    const tempPos = new THREE.Vector3();
    const tempScale = new THREE.Vector3();
    const tempQuat = new THREE.Quaternion();

    // Обновляем частицы искр
    particles.forEach((p, i) => {
      p.update(delta);
      tempPos.set(0, 0, 0);

      // Нелинейное движение: в начале быстро, потом зависает
      const progress = 1 - Math.max(0, p.life / p.maxLife);
      const easeOut = 1 - Math.pow(1 - progress, 3);

      tempPos.add(p.velocity.clone().multiplyScalar(easeOut));

      // Размер: сначала растет, потом плавно исчезает
      let currentScale = 0;
      if (progress < 0.2) {
        currentScale = p.size * (progress / 0.2); // Появление
      } else {
        currentScale = p.size * (1 - (progress - 0.2) / 0.8); // Затухание
      }

      tempScale.set(currentScale, currentScale, currentScale);
      tempMatrix.compose(tempPos, tempQuat, tempScale);
      instancesApi.current?.setMatrixAt(i, tempMatrix);
    });

    if (instancesApi.current) {
      instancesApi.current.instanceMatrix.needsUpdate = true;
    }

    // Обновляем частицы молний
    lightnings.forEach((l, i) => {
      if (l.life > 0) {
        l.update(delta);
        tempPos.set(0, 0, 0);
        tempQuat.setFromEuler(l.rotation);

        // Мерцание молнии
        const isVisible = Math.random() > 0.5 ? 1 : 0;
        const currentScale = (l.life / l.maxLife) * l.scale * isVisible;

        // Делаем их длинными и тонкими
        tempScale.set(0.1 * currentScale, 3 * currentScale, 0.1 * currentScale);
        tempMatrix.compose(tempPos, tempQuat, tempScale);
      } else {
        // Прячем мертвые молнии
        tempScale.set(0, 0, 0);
        tempMatrix.compose(tempPos, tempQuat, tempScale);
      }
      lightningApi.current?.setMatrixAt(i, tempMatrix);
    });

    if (lightningApi.current) {
      lightningApi.current.instanceMatrix.needsUpdate = true;
    }

    // Анимируем свет (яркая вспышка в начале, затем затухание)
    if (lightRef.current) {
      const lifeRatio = Math.max(0, totalLife.current / 2.5);
      // Пульсация
      const pulse = 1 + Math.sin(totalLife.current * 20) * 0.2;
      lightRef.current.intensity = Math.pow(lifeRatio, 2) * 20 * pulse;
    }
  });

  if (!active) return null;

  return (
    <group position={position}>
      {/* Динамический свет в точке удара */}
      <pointLight ref={lightRef} color="#ff3300" distance={10} decay={2} intensity={0} />

      {/* Основные кроваво-красные искры */}
      <Instances range={PARTICLE_COUNT} ref={instancesApi}>
        <sphereGeometry args={[1, 8, 8]} />
        <meshStandardMaterial
          color="#aa0000"
          emissive="#ff0000"
          emissiveIntensity={5}
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
        {particles.map((_, i) => <Instance key={i} />)}
      </Instances>

      {/* Вспышки молний/порезов */}
      <Instances range={LIGHTNING_COUNT} ref={lightningApi}>
        {/* Можно использовать box или cylinder */}
        <cylinderGeometry args={[1, 1, 1, 4]} />
        <meshStandardMaterial
          color="#ffffff"
          emissive="#ffbb00"
          emissiveIntensity={10}
          transparent
          opacity={0.8}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
        {lightnings.map((_, i) => <Instance key={`l_${i}`} />)}
      </Instances>
    </group>
  );
};
