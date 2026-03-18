import * as THREE from 'three';
import React, { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { Instances, Instance } from '@react-three/drei';
import { ECS } from '../../ecs';

// === КОНФИГУРАЦИЯ СЛЕДА ===
const TOTAL_PARTICLES = 200;
const SPAWN_INTERVAL = 0.016;
const PARTICLE_LIFETIME = 0.6; // Чуть дольше, чтобы шлейф был длиннее
const PARTICLE_SIZE = 0.35;

// Цветовая палитра Рейнджера (спектральный/магический бег)
const TRAIL_COLORS = [
    new THREE.Color('#33ccff'), // Голубой
    new THREE.Color('#33ffcc'), // Бирюзовый
    new THREE.Color('#cc33ff'), // Фиолетовый
    new THREE.Color('#ff33cc'), // Розовый
];

class TrailParticleData {
    position: THREE.Vector3;
    life: number;
    maxLife: number;
    velocity: THREE.Vector3;
    color: THREE.Color; // <-- ДОБАВИЛИ ЦВЕТ

    constructor() {
        this.position = new THREE.Vector3(0, -999, 0);
        this.maxLife = PARTICLE_LIFETIME;
        this.life = 0;
        this.velocity = new THREE.Vector3();
        this.color = new THREE.Color(); // Инициализируем пустой цвет
    }

    // Теперь принимаем цвет при активации
    activate(spawnPos: THREE.Vector3, color: THREE.Color) {
        this.life = this.maxLife;
        this.position.copy(spawnPos);
        this.color.copy(color); // ЗАПИСЫВАЕМ ЦВЕТ

        // Ветер разлетается меньше, чтобы след был четче
        this.velocity.set(
            (Math.random() - 0.5) * 1.5,
            1.0 + Math.random() * 2.5, // Сильнее вверх
            (Math.random() - 0.5) * 1.5
        );
    }

    update(delta: number) {
        if (this.life <= 0) return;
        this.life -= delta;
        this.position.add(this.velocity.clone().multiplyScalar(delta));
        this.velocity.multiplyScalar(0.94); // Трение воздуха
    }
}

export const RangerSprintTrail: React.FC = () => {
    const particles = useMemo(() => Array.from({ length: TOTAL_PARTICLES }, () => new TrailParticleData()), []);
    const nextParticleIndex = useRef(0);
    const timeSinceLastSpawn = useRef(0);
    const instancesApi = useRef<THREE.InstancedMesh>(null);

    // === ФИКС ПРОПАДАНИЯ ЧАСТИЦ (Frustum Culling) ===
    useEffect(() => {
        if (instancesApi.current) {
            // Отключаем Frustum Culling. Three.js больше не будет отсекать этот меш.
            instancesApi.current.frustumCulled = false;
        }
    }, []); // Выполняется один раз при монтировании

    useFrame((_state, delta) => {
        // 1. ГЛОБАЛЬНАЯ ЛОГИКА ТАЙМЕРА (Проверяем, пришло ли время спавнить новую порцию частиц)
        timeSinceLastSpawn.current += delta;
        const shouldSpawnThisFrame = timeSinceLastSpawn.current >= SPAWN_INTERVAL;

        if (shouldSpawnThisFrame) {
            timeSinceLastSpawn.current = 0;
        }

        // 2. ИЩЕМ И ОБРАБАТЫВАЕМ ВСЕХ РЕЙНДЖЕРОВ (и своих, и чужих)
        const rangers = ECS.world.where((e) => e.classType === 'Ranger');

        for (const player of rangers) {
            // Базовая проверка на наличие физики
            if (!player.rigidBody) continue;

            // === СИНХРОНИЗАЦИЯ: Определяем, активен ли бафф бега ===
            // Логика баффа для СЕБЯ (по локальному таймеру)
            const isMeBuff = player.isMe && player.speedBuffTimer !== undefined && player.speedBuffTimer > 0;
            // Логика баффа для ДРУГИХ (по флагу isSprinting, который прислал сервер)
            const isOtherBuff = !player.isMe && player.isSprinting === true;

            const isBuffActive = isMeBuff || isOtherBuff;

            // Если баффа нет, переходим к следующему игроку
            if (!isBuffActive) continue;

            // Проверяем, что игрок действительно бежит (а не стоит с баффом)
            const currentVelocity = player.rigidBody.linvel();
            const isMoving = Math.abs(currentVelocity.x) > 1.0 || Math.abs(currentVelocity.z) > 1.0;

            // Если пришло время спавна И игрок бежит с баффом - выстреливаем частицу!
            if (shouldSpawnThisFrame && isMoving) {
                // Берем абсолютные координаты из физики
                const pos = player.rigidBody.translation();
                // Спавним чуть позади и снизу
                const spawnPos = new THREE.Vector3(pos.x, pos.y + 0.2, pos.z);

                // Выбираем случайный цвет
                const randomColor = TRAIL_COLORS[Math.floor(Math.random() * TRAIL_COLORS.length)];

                // Активируем частицу под этим игроком
                particles[nextParticleIndex.current].activate(spawnPos, randomColor);
                nextParticleIndex.current = (nextParticleIndex.current + 1) % TOTAL_PARTICLES;
            }
        }

        // 3. ОБНОВЛЕНИЕ ЧАСТИЦ (Матрицы и цвета всего пула)
        const tempMatrix = new THREE.Matrix4();
        const tempScale = new THREE.Vector3();
        const tempQuat = new THREE.Quaternion();

        particles.forEach((p, i) => {
            p.update(delta);

            if (p.life > 0) {
                const progress = 1 - p.life / p.maxLife;
                let currentScale = 0;
                if (progress < 0.2) {
                    currentScale = PARTICLE_SIZE * (progress / 0.2);
                } else {
                    currentScale = PARTICLE_SIZE * (1 - (progress - 0.2) / 0.8);
                }

                tempScale.set(currentScale, currentScale, currentScale);
                tempMatrix.compose(p.position, tempQuat, tempScale);

                // === ПРИМЕНЯЕМ ЦВЕТ К ИНСТАНСУ ===
                instancesApi.current?.setColorAt(i, p.color);
            } else {
                // Убираем мертвые частицы
                tempMatrix.makeScale(0, 0, 0);
            }
            instancesApi.current?.setMatrixAt(i, tempMatrix);
        });

        if (instancesApi.current) {
            instancesApi.current.instanceMatrix.needsUpdate = true;
            // Обязательно сообщаем, что массив цветов тоже изменился!
            if (instancesApi.current.instanceColor) {
                instancesApi.current.instanceColor.needsUpdate = true;
            }
        }
    });

    return (
        <Instances range={TOTAL_PARTICLES} ref={instancesApi}>
            <dodecahedronGeometry args={[1, 0]} />
            {/* ИСПОЛЬЗУЕМ BASIC MATERIAL ВМЕСТО STANDARD */}
            <meshBasicMaterial
                toneMapped={false} // Отключаем влияние камеры на цвет, чтобы он был максимально ярким
                transparent
                opacity={0.8} // Чуть повысили плотность
                depthWrite={false}
                blending={THREE.AdditiveBlending}
            />
            {particles.map((_, i) => <Instance key={i} />)}
        </Instances>
    );
};