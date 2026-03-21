import { ECS } from "@/ecs";
import { socket } from "@/socket";
import { useUIStore } from "@/store";
import { useEffect } from "react";

export const useGameSockets = () => {
  useEffect(() => {
    const onPlayerShot = (arrowData: any) => ECS.world.add(arrowData);
    const onEffectSpawned = (effectData: any) => ECS.world.add(effectData);

    const onPlayerMoved = ({ id, position, rotation, animation, isAiming, isInvisible, isSprinting }: any) => {
      const entity = ECS.world.where((e) => e.id === id).first;
      if (entity && entity.rigidBody && !entity.isMe) {
        entity.rigidBody.setNextKinematicTranslation(position);
        if (entity.threeObject && rotation) {
          entity.threeObject.quaternion.set(rotation[0], rotation[1], rotation[2], rotation[3]);
        }
        if (animation) entity.currentAnimation = animation;
        if (isAiming !== undefined) entity.isAiming = isAiming;
        if (isInvisible !== undefined) entity.isInvisible = isInvisible;
        if (isSprinting !== undefined) entity.isSprinting = isSprinting;
      }
    };

    const onArrowHit = ({ arrowId, position }: any) => {
      const arrow = ECS.world.where((e) => e.id === arrowId).first;
      if (arrow && arrow.position && arrow.velocity) {
        arrow.position.x = position.x;
        arrow.position.y = position.y;
        arrow.position.z = position.z;
        arrow.velocity.x = 0;
        arrow.velocity.y = 0;
        arrow.velocity.z = 0;
        arrow.lifeTime = 3;
      }
    };

    const onPlayerHpChanged = ({ id, hp, maxHp }: any) => {
      const entity = ECS.world.where((e) => e.id === id).first;
      if (entity) {
        const oldHp = entity.hp !== undefined ? entity.hp : maxHp;
        const damageAmount = oldHp - hp;

        ECS.world.update(entity, { hp, maxHp });

        if (entity.hp !== undefined && entity.hp > 0) {
          entity.currentAnimation = Math.random() > 0.5 ? 'RecieveHit' : 'RecieveHit_2';
          entity.actionTimer = 0.3;
        }

        if (damageAmount > 0 && entity.rigidBody && !entity.isMe) {
          const pos = entity.rigidBody.translation();
          ECS.world.add({
            id: Math.random().toString(36).substring(2, 9),
            position: {
              x: pos.x + (Math.random() - 0.5) * 1.5,
              y: pos.y + 2.5 + Math.random() * 0.5,
              z: pos.z + (Math.random() - 0.5) * 1.0,
            },
            damageText: { value: damageAmount, life: 1.0 }
          });
        }

        if (entity.isMe) useUIStore.getState().setHp(hp, maxHp);
        else useUIStore.getState().setPlayerHp(id, hp, maxHp);
      }
    };

    const onPlayerDied = ({ victimId, killerId }: any) => {
      const entity = ECS.world.where((e) => e.id === victimId).first;
      if (entity) {
        ECS.world.update(entity, { currentAnimation: 'Death' });
        if (entity.isMe) useUIStore.getState().setDeathState(true, killerId);
      }
    };

    const onPlayerRespawned = ({ id, position }: any) => {
      const entity = ECS.world.where((e) => e.id === id).first;
      if (entity) {
        ECS.world.update(entity, { currentAnimation: 'Idle' });
        if (entity.isMe && entity.rigidBody) {
          entity.rigidBody.setTranslation(position, true);
          entity.rigidBody.setLinvel({ x: 0, y: 0, z: 0 }, true);
        }
      }
    };

    socket.on('playerShot', onPlayerShot);
    socket.on('effectSpawned', onEffectSpawned);
    socket.on('playerMoved', onPlayerMoved);
    socket.on('arrowHit', onArrowHit);
    socket.on('playerHpChanged', onPlayerHpChanged);
    socket.on('playerDied', onPlayerDied);
    socket.on('playerRespawned', onPlayerRespawned);

    return () => {
      socket.off('playerShot', onPlayerShot);
      socket.off('effectSpawned', onEffectSpawned);
      socket.off('playerMoved', onPlayerMoved);
      socket.off('arrowHit', onArrowHit);
      socket.off('playerHpChanged', onPlayerHpChanged);
      socket.off('playerDied', onPlayerDied);
      socket.off('playerRespawned', onPlayerRespawned);
    };
  }, []);
};