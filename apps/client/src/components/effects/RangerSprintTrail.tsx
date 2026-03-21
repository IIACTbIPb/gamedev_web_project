import * as THREE from 'three';
import React, { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { ECS } from '@/ecs';

// === КОНФИГУРАЦИЯ СЛЕДА ===
const TOTAL_PARTICLES = 200;
const SPAWN_INTERVAL = 0.010;
const PARTICLE_LIFETIME = 0.8; // Чуть дольше, чтобы шлейф был длиннее
const PARTICLE_SIZE = 0.2;

// Цветовая палитра Рейнджера (спектральный/магический бег)
const TRAIL_COLORS = [
	new THREE.Color('#33ccff'), // Голубой
	new THREE.Color('#33ffcc'), // Бирюзовый
	new THREE.Color('#cc33ff'), // Фиолетовый
	new THREE.Color('#ff33cc'), // Розовый
];

// === ГЛОБАЛЬНЫЕ ВРЕМЕННЫЕ ОБЪЕКТЫ (ОПТИМИЗАЦИЯ ПАМЯТИ) ===
const tempMatrix = new THREE.Matrix4();
const tempScale = new THREE.Vector3();
const tempQuat = new THREE.Quaternion();
const spawnPosDir = new THREE.Vector3(); // Вектор для расчета позиции спавна
const tempVelocity = new THREE.Vector3(); // Вектор для вычисления движения внутри update

class TrailParticleData {
	position: THREE.Vector3;
	life: number;
	maxLife: number;
	velocity: THREE.Vector3;
	color: THREE.Color;

	constructor() {
		this.position = new THREE.Vector3(0, -999, 0);
		this.maxLife = PARTICLE_LIFETIME;
		this.life = 0;
		this.velocity = new THREE.Vector3();
		this.color = new THREE.Color();
	}

	activate(spawnPos: THREE.Vector3, color: THREE.Color) {
		this.life = this.maxLife;
		this.position.copy(spawnPos);
		this.color.copy(color);

		this.velocity.set(
			(Math.random() - 0.5) * 1.5,
			1.0 + Math.random() * 2.5,
			(Math.random() - 0.5) * 1.5
		);
	}

	update(delta: number) {
		if (this.life <= 0) return;
		this.life -= delta;

		// Избавляемся от clone()
		tempVelocity.copy(this.velocity).multiplyScalar(delta);
		this.position.add(tempVelocity);

		this.velocity.multiplyScalar(0.94);
	}
}

export const RangerSprintTrail: React.FC = () => {
	const particles = useMemo(() => Array.from({ length: TOTAL_PARTICLES }, () => new TrailParticleData()), []);
	const nextParticleIndex = useRef(0);
	const timeSinceLastSpawn = useRef(0);
	const instancesApi = useRef<THREE.InstancedMesh>(null);

	useEffect(() => {
		if (instancesApi.current) {
			instancesApi.current.frustumCulled = false;
		}
	}, []);

	useFrame((_state, delta) => {
		timeSinceLastSpawn.current += delta;
		const shouldSpawnThisFrame = timeSinceLastSpawn.current >= SPAWN_INTERVAL;

		if (shouldSpawnThisFrame) {
			timeSinceLastSpawn.current = 0;
		}

		const rangers = ECS.world.where((e) => e.classType === 'Ranger');

		for (const player of rangers) {
			if (!player.rigidBody) continue;

			const isMeBuff = player.isMe && player.speedBuffTimer !== undefined && player.speedBuffTimer > 0;
			const isOtherBuff = !player.isMe && player.isSprinting === true;
			const isBuffActive = isMeBuff || isOtherBuff;

			if (!isBuffActive) continue;

			if (shouldSpawnThisFrame) {
				const pos = player.rigidBody.translation();

				const randomOffsetX = (Math.random() - 0.5) * 0.8;
				const randomOffsetZ = (Math.random() - 0.5) * 0.8;

				const currentVelocity = player.rigidBody.linvel();
				const isMoving = Math.abs(currentVelocity.x) > 1.0 || Math.abs(currentVelocity.z) > 1.0;

				if (!isMoving && Math.random() > 0.2) {
					continue;
				}

				// Избавляемся от new THREE.Vector3
				spawnPosDir.set(
					pos.x + randomOffsetX,
					pos.y + 0.1,
					pos.z + randomOffsetZ
				);

				const randomColor = TRAIL_COLORS[Math.floor(Math.random() * TRAIL_COLORS.length)];

				particles[nextParticleIndex.current].activate(spawnPosDir, randomColor);
				nextParticleIndex.current = (nextParticleIndex.current + 1) % TOTAL_PARTICLES;
			}
		}

		// 3. ОБНОВЛЕНИЕ ЧАСТИЦ (Используем глобальные временные объекты)
		if (instancesApi.current) {
			for (let i = 0; i < particles.length; i++) {
				const p = particles[i];
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
					tempQuat.identity(); // Сбрасываем вращение
					tempMatrix.compose(p.position, tempQuat, tempScale);

					instancesApi.current.setColorAt(i, p.color);
				} else {
					tempMatrix.makeScale(0, 0, 0);
				}
				instancesApi.current.setMatrixAt(i, tempMatrix);
			}

			instancesApi.current.instanceMatrix.needsUpdate = true;
			if (instancesApi.current.instanceColor) {
				instancesApi.current.instanceColor.needsUpdate = true;
			}
		}
	});

	return (
		// ИСПОЛЬЗУЕМ НАТИВНЫЙ instancedMesh
		<instancedMesh ref={instancesApi} args={[undefined, undefined, TOTAL_PARTICLES]}>
			<dodecahedronGeometry args={[1, 0]} />
			<meshBasicMaterial
				toneMapped={false}
				transparent
				opacity={0.8}
				depthWrite={false}
				blending={THREE.AdditiveBlending}
			/>
		</instancedMesh>
	);
};