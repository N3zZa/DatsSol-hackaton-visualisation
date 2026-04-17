import { useState, useEffect, useMemo, useRef } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import {
  OrbitControls,
  Box,
  Plane,
  Edges,
  Html,
  Octahedron,
  Cylinder,
  Cone,
  Sphere,
  Dodecahedron,
} from "@react-three/drei";
import axios from "axios";

const API_URL = "https://games-test.datsteam.dev/api/arena";
const AUTH_TOKEN = import.meta.env.VITE_API_TOKEN as string;

// --- ТИПИЗАЦИЯ ---
type Coordinate = [number, number];

interface Plantation {
  id: string;
  position: Coordinate;
  isMain?: boolean;
  isIsolated?: boolean;
  immunityUntilTurn?: number;
  hp: number;
}

interface Enemy {
  id: string;
  position: Coordinate;
  hp: number;
}

interface Cell {
  position: Coordinate;
}

// Предполагаемая структура логова бобров
interface BeaverLair {
  id: string;
  position: Coordinate;
  hp: number;
}

// Предполагаемая структура катаклизмов
interface MeteoForecast {
  type: "storm" | "earthquake";
  name?: string;
  position?: Coordinate; // Для бури
  radius?: number; // Для бури
  speed?: number; // Для бури
  turnsUntilImpact?: number; // Ходов до формирования/удара
}

interface ArenaData {
  turnNo: number;
  nextTurnIn: number;
  size: Coordinate;
  actionRange: number;
  plantations: Plantation[];
  enemy: Enemy[];
  mountains: Coordinate[];
  cells: Cell[];
  beavers?: BeaverLair[]; // Добавлено поле для бобров
  meteoForecasts?: MeteoForecast[]; // Добавлено поле для погоды
  plantationUpgrades: {
    points: number;
  };
}
// -----------------

const CameraSetup = ({ plantations }: { plantations?: Plantation[] }) => {
  const { camera } = useThree();
  const isCameraSet = useRef(false);

  useEffect(() => {
    if (!isCameraSet.current && plantations && plantations.length > 0) {
      const mainPlant = plantations.find((p) => p.isMain) || plantations[0];
      if (mainPlant) {
        const [x, y] = mainPlant.position;
        camera.position.set(x, 20, y + 20);
        isCameraSet.current = true;
      }
    }
  }, [plantations, camera]);

  return null;
};

const Ground = () => (
  <group>
    <Plane
      args={[2000, 2000]}
      rotation={[-Math.PI / 2, 0, 0]}
      position={[500, -0.5, 500]}
    >
      <meshStandardMaterial color="#d2b48c" />
    </Plane>
    <gridHelper
      args={[1000, 1000, "#a0522d", "#cdaa7d"]}
      position={[500, -0.49, 500]}
    />
  </group>
);

interface FloatingUIProps {
  hp: number;
  maxHp?: number;
  type: "main" | "enemy" | "isolated" | "beaver" | "default";
}

const FloatingUI = ({ hp, maxHp = 50, type }: FloatingUIProps) => {
  const hpPercent = Math.min((hp / maxHp) * 100, 100);

  let icon = "🏭";
  let borderColor = "#1e90ff";

  if (type === "main") {
    icon = "👑";
    borderColor = "#ff00ff";
  }
  if (type === "enemy") {
    icon = "⚔️";
    borderColor = "#ff4500";
  }
  if (type === "isolated") {
    icon = "🔌";
    borderColor = "#888888";
  }
  if (type === "beaver") {
    icon = "🦦";
    borderColor = "#8b4513";
  }

  return (
    <Html position={[0, 1.2, 0]} center style={{ pointerEvents: "none" }}>
      <div
        style={{
          background: "rgba(0, 0, 0, 0.7)",
          color: "white",
          padding: "4px 8px",
          borderRadius: "4px",
          fontFamily: "monospace",
          fontSize: "12px",
          textAlign: "center",
          border: `1px solid ${borderColor}`,
          whiteSpace: "nowrap",
        }}
      >
        <div style={{ fontSize: "14px", marginBottom: "2px" }}>
          {icon} HP: {hp}
        </div>
        <div
          style={{
            width: "60px",
            height: "4px",
            background: "#333",
            borderRadius: "2px",
            overflow: "hidden",
            margin: "0 auto",
          }}
        >
          <div
            style={{
              width: `${hpPercent}%`,
              height: "100%",
              background:
                hpPercent > 40
                  ? type === "enemy" || type === "beaver"
                    ? "#ff4500"
                    : "#32cd32"
                  : "#ff0000",
              transition: "width 0.3s",
            }}
          />
        </div>
      </div>
    </Html>
  );
};

const ArenaScene = ({ arenaData }: { arenaData: ArenaData | null }) => {
  if (!arenaData) return null;

  const {
    plantations = [],
    enemy = [],
    mountains = [],
    cells = [],
    beavers = [],
    meteoForecasts = [],
  } = arenaData;

  const isReinforcedCell = (x: number, y: number) => x % 7 === 0 && y % 7 === 0;

  return (
    <>
      <ambientLight intensity={0.6} />
      <directionalLight position={[50, 100, 20]} intensity={1.2} castShadow />

      <Ground />

      {/* Горы */}
      {mountains.map((pos, idx) => (
        <Box
          key={`mountain-${idx}`}
          position={[pos[0], 0, pos[1]]}
          args={[1, 1, 1]}
        >
          <meshStandardMaterial color="#a96a07" />
          <Edges color="#ad5507" />
        </Box>
      ))}

      {/* Терраформированные клетки */}
      {cells.map((cell, idx) => (
        <Plane
          key={`cell-${idx}`}
          position={[cell.position[0], -0.48, cell.position[1]]}
          rotation={[-Math.PI / 2, 0, 0]}
          args={[1, 1]}
        >
          <meshBasicMaterial
            color={
              isReinforcedCell(cell.position[0], cell.position[1])
                ? "rgb(240, 196, 21)"
                : "#10d24a"
            }
            transparent
            opacity={0.8}
          />
        </Plane>
      ))}

      {/* Песчаные бури */}
      {meteoForecasts
        .filter((m) => m.type === "storm" && m.position && m.radius)
        .map((storm, idx) => {
          const [x, y] = storm.position!;
          return (
            <group key={`storm-${idx}`} position={[x, 0, y]}>
              <Sphere args={[storm.radius, 32, 32]} position={[0, 0, 0]}>
                <meshStandardMaterial
                  color="#f4a460"
                  transparent
                  opacity={0.3}
                />
              </Sphere>
              <Html position={[0, storm.radius! + 2, 0]} center>
                <div
                  style={{
                    background: "rgba(205, 133, 63, 0.8)",
                    color: "white",
                    padding: "2px 6px",
                    borderRadius: "4px",
                    fontSize: "12px",
                    fontFamily: "monospace",
                  }}
                >
                  🌪 {storm.name || "Буря"}
                </div>
              </Html>
            </group>
          );
        })}

      {/* Логова бобров */}
      {beavers.map((beaver) => {
        const [x, y] = beaver.position;
        return (
          <group key={`beaver-${beaver.id}`} position={[x, 0, y]}>
            <Dodecahedron args={[0.6]} position={[0, 0.6, 0]}>
              <meshStandardMaterial color="#8b4513" />
              <Edges color="#5c3317" />
            </Dodecahedron>
            {/* У бобров 100 базовых HP согласно доке */}
            <FloatingUI hp={beaver.hp} maxHp={100} type="beaver" />
          </group>
        );
      })}

      {/* Свои плантации */}
      {plantations.map((plant) => {
        const [x, y] = plant.position;
        let color = "#1e90ff";
        let type: "main" | "isolated" | "default" = "default";

        if (plant.isMain) {
          color = "#ff00ff";
          type = "main";
        } else if (plant.isIsolated) {
          color = "#888888";
          type = "isolated";
        }

        return (
          <group key={`plant-${plant.id}`} position={[x, 0, y]}>
            {plant.isMain ? (
              <Octahedron args={[0.6]} position={[0, 0.6, 0]}>
                <meshStandardMaterial color={color} transparent opacity={0.6} />
                <Edges color="#ffffff" />
              </Octahedron>
            ) : (
              <Cylinder args={[0.4, 0.4, 0.8, 16]} position={[0, 0.4, 0]}>
                <meshStandardMaterial color={color} transparent opacity={0.6} />
                <Edges color="#ffffff" />
              </Cylinder>
            )}
            <FloatingUI hp={plant.hp} type={type} />
          </group>
        );
      })}

      {/* Вражеские плантации */}
      {enemy.map((en) => {
        const [x, y] = en.position;
        return (
          <group key={`enemy-${en.id}`} position={[x, 0, y]}>
            <Cone args={[0.5, 1, 4]} position={[0, 0.5, 0]}>
              <meshStandardMaterial color="#ff4500" transparent opacity={0.6} />
              <Edges color="#d40505" />
            </Cone>
            <FloatingUI hp={en.hp} type="enemy" />
          </group>
        );
      })}
    </>
  );
};

export default function DatsSolMap() {
  const [arenaData, setArenaData] = useState<ArenaData | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;

    const fetchArena = async () => {
      try {
        const response = await axios.get(API_URL, {
          headers: { "X-Auth-Token": AUTH_TOKEN },
        });
        setError(null);
        setArenaData(response.data);
      } catch (error) {
        setError(error);
        console.error("Ошибка получения данных арены:", error);
      }
    };

    if (!isPaused) {
      fetchArena();
      interval = setInterval(fetchArena, 1000);
    }

    return () => clearInterval(interval);
  }, [isPaused]);

  const controlsTarget = useMemo<[number, number, number]>(() => {
    if (!arenaData || !arenaData.plantations) return [400, 0, 300];
    const mainPlant =
      arenaData.plantations.find((p) => p.isMain) || arenaData.plantations[0];
    return mainPlant
      ? [mainPlant.position[0], 0, mainPlant.position[1]]
      : [400, 0, 300];
  }, [arenaData?.plantations]);

  // Проверяем наличие активных землетрясений (глобальный эвент)
  const hasEarthquake = arenaData?.meteoForecasts?.some(
    (m) => m.type === "earthquake",
  );

  return (
    <div style={{ width: "100vw", height: "100vh", background: "#111" }}>
      {error !== null && (
        <div
          style={{
            position: "absolute",
            top: 0, 
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 10,
            background: "rgba(172, 10, 10, 0.7)",
            color: "white",
            padding: "15px",
            borderRadius: "8px",
            fontFamily: "monospace",
            minWidth: "200px",
            maxWidth: "80%",
            width: "100%",
            height: "20px",
            textAlign: "center", 
            display: "flex",
            alignItems: "center", 
            justifyContent: "center",
          }}
        >
          Ошибка - возможно раунд закончен {error}
        </div>
      )}
      <div
        style={{
          position: "absolute",
          top: 20,
          left: 20,
          zIndex: 10,
          background: "rgba(0,0,0,0.7)",
          color: "white",
          padding: "15px",
          borderRadius: "8px",
          fontFamily: "monospace",
          minWidth: "200px",
        }}
      >
        <h2 style={{ margin: "0 0 10px 0" }}>DatsSol Radar</h2>

        <button
          onClick={() => setIsPaused(!isPaused)}
          style={{
            width: "100%",
            padding: "8px",
            marginBottom: "15px",
            background: isPaused ? "#ff4500" : "#32cd32",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
            fontWeight: "bold",
            fontFamily: "inherit",
          }}
        >
          {isPaused ? "▶ ВОЗОБНОВИТЬ" : "⏸ ПАУЗА"}
        </button>

        {hasEarthquake && (
          <div
            style={{
              background: "#8b0000",
              color: "white",
              padding: "8px",
              borderRadius: "4px",
              marginBottom: "10px",
              textAlign: "center",
              animation: "pulse 1s infinite",
            }}
          >
            ⚠️ ВНИМАНИЕ: ЗЕМЛЕТРЯСЕНИЕ!
          </div>
        )}

        <div style={{ fontSize: "14px", lineHeight: "1.5" }}>
          <div>
            Ход:{" "}
            <strong style={{ color: "#00ff00" }}>
              {arenaData?.turnNo || "..."}
            </strong>
          </div>
          <div>
            След. ход:{" "}
            <strong>
              {isPaused ? "Остановлено" : `${arenaData?.nextTurnIn || 0} сек`}
            </strong>
          </div>
          <hr style={{ borderColor: "#444", margin: "10px 0" }} />
          <div>
            Очки апгрейдов:{" "}
            <strong>{arenaData?.plantationUpgrades?.points || 0}</strong>
          </div>
          <div>
            Своих плантаций:{" "}
            <strong>{arenaData?.plantations?.length || 0}</strong>
          </div>
          <div>
            Бобров:{" "}
            <strong style={{ color: "#8b4513" }}>
              {arenaData?.beavers?.length || 0}
            </strong>
          </div>
          <div>
            Врагов в зоне:{" "}
            <strong style={{ color: "#ff4500" }}>
              {arenaData?.enemy?.length || 0}
            </strong>
          </div>
        </div>
      </div>

      <Canvas camera={{ fov: 50 }}>
        <CameraSetup plantations={arenaData?.plantations} />
        <OrbitControls
          enablePan={true}
          enableZoom={true}
          enableRotate={true}
          target={controlsTarget}
          maxPolarAngle={Math.PI / 2 - 0.05}
          minDistance={5}
          maxDistance={150}
        />
        <ArenaScene arenaData={arenaData} />
      </Canvas>
    </div>
  );
}
