import React, { useEffect, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text } from '@react-three/drei';
import { ECS } from '@/ecs';
import { useEntities } from 'miniplex-react';

const FLOAT_SPEED = 1.5;

export const DamageNumbersManager: React.FC = () => {
	const { entities } = useEntities(ECS.world.with('damageText', 'position'));
	const textRefs = useRef(new Map<string, any>());

	useEffect(() => {
		const warmupId = `_warmup_${Math.random().toString(36).substring(2, 9)}`;
		ECS.world.add({
			id: warmupId,
			position: { x: -999, y: -999, z: -999 },
			damageText: { value: 0, life: 0.1 }
		});
	}, []);

	useFrame((state, delta) => {
		for (const entity of entities) {
			if (!entity.position || !entity.damageText) continue;

			entity.position.y += FLOAT_SPEED * delta;
			entity.damageText.life -= delta;

			const textObj = textRefs.current.get(entity.id!);
			if (textObj) {
				textObj.position.set(entity.position.x, entity.position.y, entity.position.z);
				textObj.quaternion.copy(state.camera.quaternion);

				const opacity = Math.max(0, entity.damageText.life);
				textObj.fillOpacity = opacity;
				textObj.outlineOpacity = opacity;
			}

			if (entity.damageText.life <= 0) {
				textRefs.current.delete(entity.id!);
				ECS.world.remove(entity);
			}
		}
	});

	return (
		<group>
			{entities.map((entity) => (
				<Text
					key={entity.id}
					// Оптимизированный ref: записываем только один раз
					ref={(ref) => {
						if (ref && entity.id && !textRefs.current.has(entity.id)) {
							textRefs.current.set(entity.id, ref);
						}
					}}
					// Стартовая позиция передается декларативно, чтобы не дергать её в ref
					position={[entity.position.x!, entity.position.y!, entity.position.z!]}
					fontSize={0.4}
					color="#ff2222"
					fontWeight="bold"
					anchorX="center"
					anchorY="middle"
					outlineWidth={0.06}
					outlineColor="#000000"
					material-depthTest={false}
					renderOrder={999}
				>
					-{entity.damageText!.value}
				</Text>
			))}
		</group>
	);
};