import * as THREE from 'three';
import React, { useEffect, useMemo, type JSX } from 'react';
import { useGraph } from '@react-three/fiber';
import { useGLTF, useAnimations } from '@react-three/drei';
import { type GLTF, SkeletonUtils } from 'three-stdlib';
import { CapsuleCollider, RigidBody } from '@react-three/rapier';
import { PhysicsGroups } from '@/config/PhysicsGroups';

type ActionName = 'All Animations';

interface GLTFAction extends THREE.AnimationClip {
  name: ActionName;
}

type GLTFResult = GLTF & {
  nodes: {
    Head: THREE.SkinnedMesh;
    Gear: THREE.SkinnedMesh;
    Emote: THREE.SkinnedMesh;
    Body: THREE.SkinnedMesh;
    Zipline: THREE.SkinnedMesh;
    Hand_01: THREE.SkinnedMesh;
    def_c_hip: THREE.Bone;
  };
  materials: {
    pathfinder_head_boosted: THREE.MeshStandardMaterial;
    pathfinder_gear_boosted: THREE.MeshStandardMaterial;
    pathfinder_boosted_emotes: THREE.MeshStandardMaterial;
    pathfinder_body_boosted: THREE.MeshStandardMaterial;
    pathfinder_zipline_boosted: THREE.MeshStandardMaterial;
  };
  animations: GLTFAction[];
};

type PathfinderNPCProps = Omit<JSX.IntrinsicElements['group'], 'id'>;

export function PathfinderNPC({ position, rotation, ...props }: PathfinderNPCProps) {
  const group = React.useRef<THREE.Group>(null);

  const { scene, animations } = useGLTF('/Pathfinder.glb');
  const clone = useMemo(() => SkeletonUtils.clone(scene), [scene]);
  const { nodes, materials } = useGraph(clone) as unknown as GLTFResult;

  const { actions } = useAnimations(animations, group);

  useEffect(() => {
    const action = actions['All Animations'];
    if (action) {
      action.reset().fadeIn(0.5).play();
    }
  }, [actions]);

  const SCALE = 5;
  const capHalfHeight = 1;
  const capRadius = 1;
  const capYOffset = 2;

  return (
    <RigidBody type="fixed" colliders={false} position={position} rotation={rotation} collisionGroups={PhysicsGroups.DECORATION}>
      <CapsuleCollider args={[capHalfHeight, capRadius]} position={[0, capYOffset, 0]} />
      <group ref={group} {...props} dispose={null} scale={SCALE}>
        <group>
          <group name="pathfinder_v20_bp_w_LOD0" rotation={[Math.PI / 2, 0, 0]}>
            <skinnedMesh
              name="Head"
              geometry={nodes.Head.geometry}
              material={materials.pathfinder_head_boosted}
              skeleton={nodes.Head.skeleton}
            />
            <skinnedMesh
              name="Gear"
              geometry={nodes.Gear.geometry}
              material={materials.pathfinder_gear_boosted}
              skeleton={nodes.Gear.skeleton}
            />
            <skinnedMesh
              name="Emote"
              geometry={nodes.Emote.geometry}
              material={materials.pathfinder_boosted_emotes}
              skeleton={nodes.Emote.skeleton}
            />
            <skinnedMesh
              name="Body"
              geometry={nodes.Body.geometry}
              material={materials.pathfinder_body_boosted}
              skeleton={nodes.Body.skeleton}
            />
            <skinnedMesh
              name="Zipline"
              geometry={nodes.Zipline.geometry}
              material={materials.pathfinder_zipline_boosted}
              skeleton={nodes.Zipline.skeleton}
            />
            <skinnedMesh
              name="Hand_01"
              geometry={nodes.Hand_01.geometry}
              material={materials.pathfinder_body_boosted}
              skeleton={nodes.Hand_01.skeleton}
            />
          </group>
          <group name="Joints">
            <group name="jx_c_delta" rotation={[Math.PI / 2, 0, -Math.PI / 2]}>
              <primitive object={nodes.def_c_hip} />
              <group name="jx_c_start" />
              <group name="jx_c_pov" position={[0, 0, -0.693]}>
                <group name="jx_c_camera" />
              </group>
            </group>
          </group>
          <group name="Default_light" />
        </group>
      </group>
    </RigidBody>
  );
}

useGLTF.preload('/Pathfinder.glb');
