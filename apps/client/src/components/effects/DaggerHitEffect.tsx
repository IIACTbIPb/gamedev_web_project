import * as THREE from 'three';
import React, { useRef, useMemo, useState } from 'react';
import { useFrame } from '@react-three/fiber';

// Количество частиц в одном всплеске
const PARTICLE_COUNT = 150;
const LIGHTNING_COUNT = 5;

// === ГЛОБАЛЬНЫЕ ВРЕМЕННЫЕ ОБЪЕКТЫ ===
const tempMatrix = new THREE.Matrix4();
const tempPos = new THREE.Vector3();
const tempScale = new THREE.Vector3();
const tempQuat = new THREE.Quaternion();

// === ГЛОБАЛЬНЫЕ ГЕОМЕТРИИ И МАТЕРИАЛЫ (ОПТИМИЗАЦИЯ ПАМЯТИ) ===
// Создаются один раз при загрузке игры, а не при каждом ударе кинжалом!
const particleGeometry = new THREE.SphereGeometry(1, 8, 8);
const particleMaterial = new THREE.MeshBasicMaterial({
  color: "#ff0000",
  transparent: true,
  depthWrite: false,
  blending: THREE.AdditiveBlending
});

const lightningGeometry = new THREE.CylinderGeometry(1, 1, 1, 4);
const lightningMaterial = new THREE.MeshBasicMaterial({
  color: "#ffbb00",
  transparent: true,
  opacity: 0.8,
  depthWrite: false,
  blending: THREE.AdditiveBlending
});

class ParticleData {
  velocity: THREE.Vector3;
  life: number;
  maxLife: number;
  size: number;
  colorOffset: number;

  constructor() {
    this.velocity = new THREE.Vector3(
      (Math.random() - 0.5) * 15,
      (Math.random() - 0.5) * 15,
      (Math.random() - 0.5) * 15,
    );
    this.maxLife = 0.8 + Math.random() * 1.2;
    this.life = this.maxLife;
    this.size = 0.15 + Math.random() * 0.3;
    this.colorOffset = Math.random();
  }

  update(delta: number) {
    this.life -= delta;
    this.velocity.multiplyScalar(0.92);
  }
}

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
    this.maxLife = 0.3 + Math.random() * 0.4;
    this.life = this.maxLife;
    this.speed = (Math.random() - 0.5) * 10;
  }

  update(delta: number) {
    this.life -= delta;
    this.rotation.z += this.speed * delta;
  }
}

interface DaggerHitEffectProps {
  position: [number, number, number];
  onFinish?: () => void;
}

export const DaggerHitEffect: React.FC<DaggerHitEffectProps> = ({ position, onFinish }) => {
  const particles = useMemo(() => Array.from({ length: PARTICLE_COUNT }, () => new ParticleData()), []);
  const lightnings = useMemo(() => Array.from({ length: LIGHTNING_COUNT }, () => new LightningData()), []);

  const [active, setActive] = useState(true);
  const totalLife = useRef(2.5);

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

    if (instancesApi.current) {
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        p.update(delta);

        tempPos.set(0, 0, 0);
        tempQuat.identity();

        const progress = 1 - Math.max(0, p.life / p.maxLife);
        const easeOut = 1 - Math.pow(1 - progress, 3);

        tempPos.copy(p.velocity).multiplyScalar(easeOut);

        let currentScale = 0;
        if (progress < 0.2) {
          currentScale = p.size * (progress / 0.2);
        } else {
          currentScale = p.size * (1 - (progress - 0.2) / 0.8);
        }

        tempScale.set(currentScale, currentScale, currentScale);
        tempMatrix.compose(tempPos, tempQuat, tempScale);
        instancesApi.current.setMatrixAt(i, tempMatrix);
      }
      instancesApi.current.instanceMatrix.needsUpdate = true;
    }

    if (lightningApi.current) {
      for (let i = 0; i < lightnings.length; i++) {
        const l = lightnings[i];

        if (l.life > 0) {
          l.update(delta);
          tempPos.set(0, 0, 0);
          tempQuat.setFromEuler(l.rotation);

          const isVisible = Math.random() > 0.5 ? 1 : 0;
          const currentScale = (l.life / l.maxLife) * l.scale * isVisible;

          tempScale.set(0.1 * currentScale, 3 * currentScale, 0.1 * currentScale);
          tempMatrix.compose(tempPos, tempQuat, tempScale);
        } else {
          tempScale.set(0, 0, 0);
          tempMatrix.compose(tempPos, tempQuat, tempScale);
        }
        lightningApi.current.setMatrixAt(i, tempMatrix);
      }
      lightningApi.current.instanceMatrix.needsUpdate = true;
    }

    if (lightRef.current) {
      const lifeRatio = Math.max(0, totalLife.current / 2.5);
      const pulse = 1 + Math.sin(totalLife.current * 20) * 0.2;
      lightRef.current.intensity = Math.pow(lifeRatio, 2) * 20 * pulse;
    }
  });

  if (!active) return null;

  return (
    <group position={position}>
      <pointLight ref={lightRef} color="#ff3300" distance={10} decay={2} intensity={0} />

      {/* Передаем наши глобальные константы прямо в args */}
      <instancedMesh
        ref={instancesApi}
        args={[particleGeometry, particleMaterial, PARTICLE_COUNT]}
      />

      <instancedMesh
        ref={lightningApi}
        args={[lightningGeometry, lightningMaterial, LIGHTNING_COUNT]}
      />
    </group>
  );
};