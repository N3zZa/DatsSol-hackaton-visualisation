import * as THREE from "three";
import {
  Circle,
  Instances,
  Instance,
  Sparkles,
  Sphere,
  Stars,
  useGLTF,
  useTexture,
} from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import { useMemo } from "react";

// 1. Космос теперь двигается за фокусом (иллюзия бесконечности)
export function SpaceBackground({
  target,
}: {
  target: [number, number, number];
}) {
  const { scene } = useGLTF("/space.glb");
  const ref = useRef<{ rotation: { x: number; y: number } }>(null);
  useFrame((state, delta) => {
    if (ref.current) ref.current.rotation.y += delta * 0.01;
  });
  return (
    <primitive
      object={scene}
      scale={20}
      position={target}
    />
  );
}

useGLTF.preload("/space.glb");

// Компонент процедурных астероидов
const AsteroidBelt = ({ radius, count = 150 }) => {
  const asteroids = useMemo(() => {
    const temp = [];
    for (let i = 0; i < count; i++) {
      // Распределяем астероиды кольцом вокруг планеты
      const angle = Math.random() * Math.PI * 2;
      const distance = radius + 40 + Math.random() * 80; // Дистанция от края
      const x = Math.cos(angle) * distance;
      const z = Math.sin(angle) * distance;
      const y = 20 + (Math.random() - 0.5) * 25; // Небольшой разброс по высоте
      const scale = 0.5 + Math.random() * 2;
      const rotation = [Math.random() * Math.PI, Math.random() * Math.PI, 0];
      temp.push({ position: [x, y, z], scale, rotation });
    }
    return temp;
  }, [radius, count]);

  return (
    <Instances limit={count} castShadow receiveShadow>
      <dodecahedronGeometry args={[1, 0]} /> {/* Low-poly камни */}
      <meshStandardMaterial color="#555566" roughness={0.8} />
      {asteroids.map((ast, i) => (
        <Instance
          key={i}
          position={ast.position}
          scale={ast.scale}
          rotation={ast.rotation}
        />
      ))}
    </Instances>
  );
};

export const PlanetSurface = ({ mapSize }: { mapSize: [number, number] }) => {
  const centerX = mapSize[0] / 2;
  const centerZ = mapSize[1] / 2;
  const maxDim = Math.max(mapSize[0], mapSize[1]);
  const radius = maxDim * 0.6;

  return (
    <group position={[centerX, 0, centerZ]}>
      {/* <Circle
        receiveShadow
        args={[radius, 128]}
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -0.5, 0]}
      >

        <meshStandardMaterial color="#2a2a35" roughness={0.9} metalness={0.1} />
      </Circle> */}
      {/* 2. Тело планеты снизу */}
      <Sphere
        args={[radius, 64, 32, 0, Math.PI * 2, 0, Math.PI / 2]}
        rotation={[Math.PI, 0, 0]}
        position={[0, -0.51, 0]}
      >
        <meshStandardMaterial color="#1a1a25" roughness={1} />
      </Sphere>

      {/* 3. ОБЪЕМНАЯ АТМОСФЕРА */}
      {/* Сфера чуть большего размера с аддитивным смешиванием (эффект свечения газа) */}
      <Sphere args={[radius * 1.05, 64, 64]} position={[0, -20, 0]}>
        <meshBasicMaterial
          color="#2266cc"
          transparent
          opacity={0.05}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          side={THREE.BackSide} // Рендерим только внутреннюю сторону, чтобы не перекрывать камеру
        />
      </Sphere>

      {/* 4. Космическое окружение */}
      <Stars
        radius={300}
        depth={60}
        count={10000}
        factor={7}
        saturation={0}
        fade
        speed={1}
      />
      <Sparkles
        count={500}
        scale={radius * 2}
        size={2}
        speed={0.2}
        color="#88bbff"
        opacity={0.5}
      />

      {/* 5. Пояс астероидов */}
      <AsteroidBelt radius={radius} count={200} />

      {/* Sci-fi сетка (делаем ее тоньше и прозрачнее) */}
      {/* <gridHelper
        args={[maxDim, maxDim, "#445588", "#af8137"]}
        position={[0.5, -0.49, 0.5]}
      /> */}
    </group>
  );
};

// 1. Компонент процедурного камня
const ProceduralRock = ({
  position,
  scale,
}: {
  position: [number, number, number];
  scale: number;
}) => {
  return (
    <mesh
      position={position}
      scale={scale}
      // Случайный поворот, чтобы камни выглядели по-разному
      rotation={[Math.random() * Math.PI, Math.random() * Math.PI, 0]}
      castShadow
      receiveShadow
    >
      {/* Додекаэдр с детализацией 0 выглядит как отличный лоу-поли булыжник */}
      <dodecahedronGeometry args={[1, 0]} />
      <meshStandardMaterial color="#6b5b4f" roughness={0.9} metalness={0.1} />
    </mesh>
  );
};

const FollowGrid = ({
  target,
  size = 15,
}: {
  target: [number, number, number];
  size?: number;
}) => {
  const gridRef = useRef<THREE.Group>(null);

  useFrame(() => {
    if (gridRef.current && target) {
      // Плавно перемещаем сетку за целью, но оставляем её на фиксированной высоте
      gridRef.current.position.set(target[0], 0.02, target[2]);
    }
  });

  return (
    <group ref={gridRef}>
      <gridHelper
        args={[size, size, "#af8137", "#b1ada5"]}
        position={[0.5, -0.45, 0.5]} // Чуть выше земли, чтобы не было мерцания
      />
    </group>
  );
};

const RocksInRadius = ({
  center,
  radius,
  count,
}: {
  center: [number, number];
  radius: number;
  count: number;
}) => {
  const rocks = useMemo(() => {
    const temp = [];
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const r = Math.random() * radius;
      temp.push({
        x: center[0] + Math.cos(angle) * r,
        z: center[1] + Math.sin(angle) * r,
        scale: Math.random() * 0.4 + 0.1,
      });
    }
    return temp;
  }, [center, radius, count]);

  return (
    <>
      {rocks.map((rock, i) => (
        <ProceduralRock
          key={i}
          position={[rock.x, -0.4, rock.z]}
          scale={rock.scale}
        />
      ))}
    </>
  );
};

// 2. Новая объемная земля (Волны появятся, когда добавишь текстуры)
export const VolumetricGround = ({
  mapSize,
  target,
}: {
  mapSize: [number, number];
  target: [number, number, number];
}) => {
  const maxDim = Math.max(mapSize[0], mapSize[1]);
  const radius = maxDim * 0.6; // Радиус нашей игровой зоны

  const [colorMap, normalMap, displacementMap, roughnessMap, aoMap] =
    useTexture([
      "/textures/sand_diff.jpg",
      "/textures/sand_nor_gl.jpg",
      "/textures/sand_disp.jpg",
      "/textures/sand_rough.jpg",
      "/textures/sand_ao.jpg",
    ]);

  useMemo(() => {
    const textureScale = 0.2; // Настройка плотности текстуры
    [colorMap, normalMap, displacementMap, roughnessMap, aoMap].forEach((t) => {
      t.wrapS = t.wrapT = THREE.RepeatWrapping;
      t.repeat.set(radius * textureScale, radius * textureScale);
      t.anisotropy = 16;
    });
  }, [colorMap, radius]);

  return (
    <group>
      {/* ПЛАНЕТАРНЫЙ ДИСК (Объемный) */}
      <mesh position={[mapSize[0] / 2, -1.0, mapSize[1] / 2]} receiveShadow>
        {/* CylinderGeometry: верхний радиус, нижний радиус, высота, сегменты по кругу, сегменты по высоте */}
        <cylinderGeometry args={[radius, radius, 1.5, 128, 64]} />

        <meshStandardMaterial
          map={colorMap}
          normalMap={normalMap}
          roughnessMap={roughnessMap}
          aoMap={aoMap}
          displacementMap={displacementMap}
          displacementScale={0.4}
          displacementBias={-0.5}
          color="#e3c08d" // Песчаный оттенок, подкрашивающий текстуру
          metalness={0.0}
        />
      </mesh>

      {/* Сетка вокруг цели */}
      {target && <FollowGrid target={target} size={20} />}

      {/* Камни (генерируем внутри круга) */}
      <RocksInRadius
        center={[mapSize[0] / 2, mapSize[1] / 2]}
        radius={radius}
        count={40}
      />
    </group>
  );
};
