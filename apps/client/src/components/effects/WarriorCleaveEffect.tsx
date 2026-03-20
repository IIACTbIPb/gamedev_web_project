import * as THREE from 'three';
import React, { useRef, useMemo, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Instances, Instance } from '@react-three/drei';

// === КОНФИГУРАЦИЯ ЭФФЕКТА ===
const SPARK_COUNT = 80;
const MAX_DISTANCE = 4.0;
const WAVE_LIFETIME = 0.35;
const TILT_ANGLE = -Math.PI / 4;

// === ГЛОБАЛЬНЫЕ ВРЕМЕННЫЕ ОБЪЕКТЫ (ОПТИМИЗАЦИЯ ПАМЯТИ) ===
const tempMatrix = new THREE.Matrix4();
const tempPos = new THREE.Vector3();
const tempScale = new THREE.Vector3();
const tempQuat = new THREE.Quaternion();
const moveVec = new THREE.Vector3();

class SparkData {
    velocity: THREE.Vector3;
    life: number;
    maxLife: number;
    size: number;
    offset: THREE.Vector3;

    constructor() {
        this.velocity = new THREE.Vector3(
            (Math.random() - 0.5) * 1.5,
            (Math.random() - 0.5) * 3.0,
            8 + Math.random() * 6
        );

        this.maxLife = WAVE_LIFETIME + Math.random() * 0.2;
        this.life = this.maxLife;
        this.size = 0.1 + Math.random() * 0.25;

        this.offset = new THREE.Vector3(
            (Math.random() - 0.5) * 0.2,
            (Math.random() - 0.5) * 2.5,
            0
        );

        this.offset.applyAxisAngle(new THREE.Vector3(0, 0, 1), TILT_ANGLE);
    }

    update(delta: number) {
        this.life -= delta;
        this.velocity.multiplyScalar(0.92);
    }
}

interface WarriorCleaveEffectProps {
    position: { x: number; y: number; z: number };
    rotation: { x: number; y: number; z: number; w: number };
    onFinish?: () => void;
}

export const WarriorCleaveEffect: React.FC<WarriorCleaveEffectProps> = ({ position, rotation, onFinish }) => {
    const sparks = useMemo(() => Array.from({ length: SPARK_COUNT }, () => new SparkData()), []);
    const quat = useMemo(() => new THREE.Quaternion(rotation.x, rotation.y, rotation.z, rotation.w), [rotation]);

    const [active, setActive] = useState(true);
    const waveLife = useRef(WAVE_LIFETIME);

    const sparkApi = useRef<THREE.InstancedMesh>(null);
    const waveCoreRef = useRef<THREE.Mesh>(null);
    const waveGlowRef = useRef<THREE.Mesh>(null);
    const lightRef = useRef<THREE.PointLight>(null);

    useFrame((_state, delta) => {
        if (!active) return;

        waveLife.current -= delta;
        if (waveLife.current <= -0.2) {
            setActive(false);
            onFinish?.();
            return;
        }

        // === 1. ПОЛЕТ ВОЛНЫ ===
        const progress = Math.max(0, 1 - Math.max(0, waveLife.current) / WAVE_LIFETIME);
        const currentZ = progress * MAX_DISTANCE;

        if (waveCoreRef.current && waveGlowRef.current && lightRef.current) {
            waveCoreRef.current.position.set(0, 0, currentZ);
            waveGlowRef.current.position.set(0, 0, currentZ);
            lightRef.current.position.set(0, 0, currentZ);

            const scaleFade = 1 - Math.pow(progress, 3);

            waveCoreRef.current.scale.set(0.1 * scaleFade, 2.5 * scaleFade, 0.8 * scaleFade);
            waveGlowRef.current.scale.set(0.3 * scaleFade, 2.8 * scaleFade, 1.2 * scaleFade);

            lightRef.current.intensity = scaleFade * 30;
        }

        // === 2. ПОЛЕТ ИСКР (ОПТИМИЗИРОВАННО) ===
        if (sparkApi.current) {
            for (let i = 0; i < sparks.length; i++) {
                const p = sparks[i];
                p.update(delta);

                if (p.life > 0) {
                    tempPos.copy(p.offset);

                    // Избегаем p.velocity.clone()
                    moveVec.copy(p.velocity).multiplyScalar(p.maxLife - p.life);
                    tempPos.add(moveVec);

                    const sparkProgress = 1 - p.life / p.maxLife;
                    const currentScale = p.size * (1 - sparkProgress);

                    tempScale.set(currentScale, currentScale, currentScale);
                    tempQuat.identity(); // Сбрасываем кватернион
                    tempMatrix.compose(tempPos, tempQuat, tempScale);
                } else {
                    tempScale.set(0, 0, 0);
                    tempQuat.identity();
                    tempMatrix.compose(tempPos, tempQuat, tempScale);
                }
                sparkApi.current.setMatrixAt(i, tempMatrix);
            }
            sparkApi.current.instanceMatrix.needsUpdate = true;
        }
    });

    if (!active) return null;

    return (
        <group position={[position.x, position.y, position.z]} quaternion={quat}>
            <pointLight ref={lightRef} color="#ff6600" distance={8} decay={2} intensity={30} />

            <mesh ref={waveCoreRef} rotation={[0, 0, TILT_ANGLE]}>
                <sphereGeometry args={[1, 16, 16]} />
                <meshBasicMaterial
                    color="#ffffff"
                    transparent
                    depthWrite={false}
                    blending={THREE.AdditiveBlending}
                />
            </mesh>

            <mesh ref={waveGlowRef} rotation={[0, 0, TILT_ANGLE]}>
                <sphereGeometry args={[1, 16, 16]} />
                <meshBasicMaterial
                    color="#ff3300"
                    transparent
                    opacity={0.6}
                    depthWrite={false}
                    blending={THREE.AdditiveBlending}
                />
            </mesh>

            <Instances range={SPARK_COUNT} ref={sparkApi}>
                <dodecahedronGeometry args={[1, 0]} />
                <meshBasicMaterial
                    color="#ffcc00"
                    transparent
                    depthWrite={false}
                    blending={THREE.AdditiveBlending}
                />
                {sparks.map((_, i) => <Instance key={`s_${i}`} />)}
            </Instances>
        </group>
    );
};