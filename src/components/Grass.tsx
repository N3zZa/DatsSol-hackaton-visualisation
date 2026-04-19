import * as THREE from "three";
import React, { useEffect, type JSX } from "react";
import { useGLTF } from "@react-three/drei";
import type { GLTF } from "three-stdlib";

type GLTFResult = GLTF & {
  nodes: {
    Grass1_Grass_Mat_0: THREE.Mesh;
    Grass1_Grass2_Mat_0: THREE.Mesh;
    Grass1_Grass1_Mat_0: THREE.Mesh;
    GrassLawnAutumn_Grass_Mat1_0: THREE.Mesh;
    GrassLawnAutumn_Grass2_Mat1_0: THREE.Mesh;
    GrassLawnAutumn_Grass1_Mat1_0: THREE.Mesh;
    GrassLawnAutumn_Grass3_Mat_0: THREE.Mesh;
    GrassAutumn3_Grass2_Mat3_0: THREE.Mesh;
    GrassAutumn3_Grass1_Mat3_0: THREE.Mesh;
  };
  materials: {
    Grass_Mat: THREE.MeshStandardMaterial;
    Grass2_Mat: THREE.MeshStandardMaterial;
    Grass1_Mat: THREE.MeshStandardMaterial;
    Grass_Mat1: THREE.MeshStandardMaterial;
    Grass2_Mat1: THREE.MeshStandardMaterial;
    Grass1_Mat1: THREE.MeshStandardMaterial;
    Grass3_Mat: THREE.MeshStandardMaterial;
    Grass2_Mat3: THREE.MeshStandardMaterial;
    Grass1_Mat3: THREE.MeshStandardMaterial;
  };
};

export function Grass(props: JSX.IntrinsicElements["group"]) {
  const { nodes, materials } = useGLTF("/grass.glb") as unknown as GLTFResult;

  useEffect(() => {
    Object.values(materials).forEach((mat) => {
      if (mat instanceof THREE.MeshStandardMaterial) {
        mat.color.set("#2d8a2a");

        mat.roughness = 0.9;
        mat.metalness = 0.0;
      }
    });
  }, [materials]);

  return (
    <group {...props} dispose={null}>
      <group scale={0.01}>
        <mesh
          castShadow
          receiveShadow
          geometry={nodes.Grass1_Grass_Mat_0.geometry}
          material={materials.Grass_Mat}
        />
        <mesh
          castShadow
          receiveShadow
          geometry={nodes.Grass1_Grass2_Mat_0.geometry}
          material={materials.Grass2_Mat}
        />
        <mesh
          castShadow
          receiveShadow
          geometry={nodes.Grass1_Grass1_Mat_0.geometry}
          material={materials.Grass1_Mat}
        />
      </group>
      <group scale={0.01}>
        <mesh
          castShadow
          receiveShadow
          geometry={nodes.GrassLawnAutumn_Grass_Mat1_0.geometry}
          material={materials.Grass_Mat1}
        />
        <mesh
          castShadow
          receiveShadow
          geometry={nodes.GrassLawnAutumn_Grass2_Mat1_0.geometry}
          material={materials.Grass2_Mat1}
        />
        <mesh
          castShadow
          receiveShadow
          geometry={nodes.GrassLawnAutumn_Grass1_Mat1_0.geometry}
          material={materials.Grass1_Mat1}
        />
        <mesh
          castShadow
          receiveShadow
          geometry={nodes.GrassLawnAutumn_Grass3_Mat_0.geometry}
          material={materials.Grass3_Mat}
        />
      </group>
      <group scale={0.01}>
        <mesh
          castShadow
          receiveShadow
          geometry={nodes.GrassAutumn3_Grass2_Mat3_0.geometry}
          material={materials.Grass2_Mat3}
        />
        <mesh
          castShadow
          receiveShadow
          geometry={nodes.GrassAutumn3_Grass1_Mat3_0.geometry}
          material={materials.Grass1_Mat3}
        />
      </group>
    </group>
  );
}

useGLTF.preload("/grass.glb");
