import React, { useEffect, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text } from '@react-three/drei';
import { ECS } from '../../ecs';
import { useEntities } from 'miniplex-react';

const FLOAT_SPEED = 1.5;

export const DamageNumbersManager: React.FC = () => {
	const { entities } = useEntities(ECS.world.with('damageText', 'position'));

	// Храним ссылки на сами объекты Text, а не на их материалы
	const textRefs = useRef(new Map<string, any>());

	useEffect(() => {
		// Создаем невидимую цифру урона, которая живет всего 0.1 секунды
		ECS.world.add({
			id: '_warmup_text',
			position: { x: -999, y: -999, z: -999 }, // Прячем далеко под карту
			damageText: {
				value: 0,
				life: 0.1, // Быстро исчезнет
			}
		});

		// Нам не нужно удалять её вручную, useFrame это сделает сам.
		// Three.js скомпилирует шейдер текста, пока она "живет".
	}, []); // Выполняется один раз при монтировании

	useFrame((state, delta) => {
		for (const entity of entities) {
			if (!entity.position || !entity.damageText) continue;

			entity.position.y += FLOAT_SPEED * delta;
			entity.damageText.life -= delta;

			const textObj = textRefs.current.get(entity.id!);
			if (textObj) {
				// Устанавливаем позицию
				textObj.position.set(entity.position.x, entity.position.y, entity.position.z);

				// === МАГИЯ БИЛЛБОРДИНГА ===
				// Заставляем текст всегда смотреть точно в камеру
				textObj.quaternion.copy(state.camera.quaternion);

				// Устанавливаем прозрачность
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
					ref={(ref) => {
						if (ref && entity.id) {
							textRefs.current.set(entity.id, ref);
							// Сразу ставим начальную позицию, чтобы цифра не прыгала в 1-й кадр
							ref.position.set(entity.position.x!, entity.position.y!, entity.position.z!);
						}
					}}
					fontSize={0.4}
					color="#ff2222"
					fontWeight="bold"
					anchorX="center"
					anchorY="middle"
					outlineWidth={0.06}
					outlineColor="#000000"
					material-depthTest={false}
					renderOrder={999} // Гарантируем отрисовку поверх эффектов
				>
					-{entity.damageText!.value}
				</Text>
			))}
		</group>
	);
};