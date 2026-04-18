import * as THREE from "three";
import { useGLTF } from "@react-three/drei";
import type { GLTF } from "three-stdlib";

type GLTFResult = GLTF & {
  nodes: {
    Object_2: THREE.Mesh;
  };
  materials: {
    initialShadingGroup: THREE.MeshStandardMaterial;
  };
};

// Добавляем пропсы для цвета и силы свечения
interface LabProps {
  teamColor?: string;
  glow?: number;
}

export function Laboratory({
  ...props
}: LabProps) {
  const { nodes, materials } = useGLTF(
    "/laboratory.glb",
  ) as unknown as GLTFResult;

  return (
    <group {...props} dispose={null}>
      <mesh
        castShadow
        receiveShadow
        geometry={nodes.Object_2.geometry}
        material={materials.initialShadingGroup}
        rotation={[-Math.PI / 2, 0, 0]}
      >
      </mesh>
    </group>
  );
}

useGLTF.preload("/laboratory.glb");
