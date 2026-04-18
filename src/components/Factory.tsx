import * as THREE from "three";
import React, { type JSX } from "react";
import { useGLTF } from "@react-three/drei";
import type { GLTF } from "three-stdlib";

type GLTFResult = GLTF & {
  nodes: {
    CellbaseLOW_LabcellMat_0: THREE.Mesh;
    CellUpLOW_LabcellMat2_0: THREE.Mesh;
    PalkaLOW_LabcellMat2_0: THREE.Mesh;
    PipeLOW_LabcellMat2_0: THREE.Mesh;
    CellLOW_LabcellMat2_0: THREE.Mesh;
    PalkaLOW001_LabcellMat2_0: THREE.Mesh;
  };
  materials: {
    LabcellMat: THREE.MeshPhysicalMaterial;
    LabcellMat2: THREE.MeshPhysicalMaterial;
  };
};

export function Factory(props: JSX.IntrinsicElements["group"]) {
  const { nodes, materials } = useGLTF(
    "/factory.glb"
  ) as unknown as GLTFResult;
  return (
    <group {...props} dispose={null}>
      <group rotation={[-Math.PI / 2, 0, 0]} scale={0.867}>
        <group rotation={[Math.PI / 2, 0, 0]} scale={0.01}>
          <mesh
            castShadow
            receiveShadow
            geometry={nodes.CellbaseLOW_LabcellMat_0.geometry}
            material={materials.LabcellMat}
            rotation={[-Math.PI / 2, 0, 0]}
            scale={100}
          />
          <mesh
            castShadow
            receiveShadow
            geometry={nodes.CellUpLOW_LabcellMat2_0.geometry}
            material={materials.LabcellMat2}
            rotation={[-Math.PI / 2, 0, 0]}
            scale={100}
          />
          <mesh
            castShadow
            receiveShadow
            geometry={nodes.PalkaLOW_LabcellMat2_0.geometry}
            material={materials.LabcellMat2}
            rotation={[-Math.PI / 2, 0, 0]}
            scale={100}
          />
          <mesh
            castShadow
            receiveShadow
            geometry={nodes.PipeLOW_LabcellMat2_0.geometry}
            material={materials.LabcellMat2}
            rotation={[-Math.PI / 2, 0, 0]}
            scale={100}
          />
          <mesh
            castShadow
            receiveShadow
            geometry={nodes.CellLOW_LabcellMat2_0.geometry}
            material={materials.LabcellMat2}
            rotation={[-Math.PI / 2, 0, 0]}
            scale={100}
          />
          <mesh
            castShadow
            receiveShadow
            geometry={nodes.PalkaLOW001_LabcellMat2_0.geometry}
            material={materials.LabcellMat2}
            rotation={[-Math.PI / 2, 0, 0]}
            scale={100}
          />
        </group>
      </group>
    </group>
  );
}

useGLTF.preload("/sci-factory.glb");
