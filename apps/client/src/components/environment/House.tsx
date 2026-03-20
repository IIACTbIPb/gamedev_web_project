import * as THREE from 'three'
import { useGLTF } from '@react-three/drei'
import { type GLTF } from 'three-stdlib'
import { useMemo, type JSX } from 'react'

type GLTFResult = GLTF & {
  nodes: {
    Cube001: THREE.Mesh
    Cube001_1: THREE.Mesh
    Cube001_2: THREE.Mesh
    Cube001_3: THREE.Mesh
    Cube001_4: THREE.Mesh
  }
  materials: {
    WallHouseBeams12: THREE.MeshStandardMaterial
    LightBrownHouseBeams12: THREE.MeshStandardMaterial
    DarkBrown1HouseBeams12: THREE.MeshStandardMaterial
    YellowHouseBeams12: THREE.MeshStandardMaterial
    DarkBrown2HouseBeams12: THREE.MeshStandardMaterial
  }
}

interface HouseProps extends Omit<JSX.IntrinsicElements['group'], 'id'> {
  wallColor?: string;
}

export function House({ wallColor = '#ffffff', ...props }: HouseProps) {
  const { nodes, materials } = useGLTF('/House.glb') as unknown as GLTFResult

  // 2. КЛОНИРУЕМ МАТЕРИАЛ! 
  // Используем useMemo, чтобы клонирование происходило только при изменении цвета, а не каждый кадр
  const customWallMaterial = useMemo(() => {
    // Берем материал стен (например, Cube001, посмотри в своем коде, какой именно отвечает за большие стены)
    const mat = materials.WallHouseBeams12.clone();

    // Накидываем оттенок
    mat.color.set(wallColor);

    return mat;
  }, [materials.WallHouseBeams12, wallColor]);

  return (
    <group {...props} dispose={null}>
      {/* 3. Применяем наш КАСТОМНЫЙ материал к геометрии стен */}
      <mesh castShadow receiveShadow geometry={nodes.Cube001.geometry} material={customWallMaterial} />

      {/* Остальные элементы (балки, крышу) оставляем общими для всех домов */}
      <mesh castShadow receiveShadow geometry={nodes.Cube001_1.geometry} material={materials.LightBrownHouseBeams12} />
      <mesh castShadow receiveShadow geometry={nodes.Cube001_2.geometry} material={materials.DarkBrown1HouseBeams12} />
      <mesh castShadow receiveShadow geometry={nodes.Cube001_3.geometry} material={materials.YellowHouseBeams12} />
      <mesh castShadow receiveShadow geometry={nodes.Cube001_4.geometry} material={materials.DarkBrown2HouseBeams12} />
    </group>
  )
}

useGLTF.preload('/House.glb')
