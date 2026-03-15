import { useFrame } from '@react-three/fiber';
import { Vector3 } from 'three';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'; // Импортируем правильный тип
import { world } from '../ecs';

const localPlayers = world.with('rigidBody', 'isMe');

// Предвыделяем память для векторов
const targetPosition = new Vector3();
const previousTarget = new Vector3();
const targetShift = new Vector3();

export const CameraFollowSystem = () => {
  useFrame((state, delta) => {
    // Безопасно кастуем тип без использования any
    const controls = state.controls as unknown as OrbitControlsImpl;

    for (const entity of localPlayers) {
      if (!entity.isMe || !entity.rigidBody) continue;

      const playerPos = entity.rigidBody.translation();

      if (controls) {
        // 1. Запоминаем текущую позицию фокуса (таргета)
        previousTarget.copy(controls.target);

        // 2. Вычисляем идеальную позицию (чуть выше игрока) и плавно двигаем таргет к ней
        targetPosition.set(playerPos.x, playerPos.y + 1, playerPos.z);
        controls.target.lerp(targetPosition, delta * 10);

        // 3. Вычисляем вектор смещения: на сколько сдвинулся таргет за этот кадр
        targetShift.subVectors(controls.target, previousTarget);

        // 4. Сдвигаем саму камеру на точно такой же вектор!
        // Это сохраняет дистанцию и угол обзора, которые ты задал правой кнопкой мыши
        state.camera.position.add(targetShift);

        // Обязательно обновляем контроллер
        controls.update();
      }
    }
  });

  return null;
};
