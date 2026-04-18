import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import {
  OrbitControls,
  Plane,
  Edges,
  Html,
  Cone,
  Sphere,
  Ring,
  Circle,
  Environment,
} from "@react-three/drei";
import axios, { AxiosError } from "axios";
import { Mountain } from "./components/Mountain";
import { Beaver } from "./components/Beaver";
import {
  PlanetSurface,
  SpaceBackground,
  VolumetricGround,
} from "./components/Space";
import { Laboratory } from "./components/Laboratory";
import { Factory } from "./components/Factory";
import { Bloom, EffectComposer, Vignette } from "@react-three/postprocessing";
import { Grass } from "./components/Grass";

const API_URL = "https://games.datsteam.dev/api/arena";
const AUTH_TOKEN = import.meta.env.VITE_API_TOKEN as string;

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
  terraformationProgress: number;
  turnsUntilDegradation: number;
}

interface BeaverLair {
  id: string;
  position: Coordinate;
  hp: number;
}

interface MeteoForecast {
  type: "storm" | "earthquake";
  name?: string;
  position?: Coordinate; // Для бури
  radius?: number; // Для бури
  speed?: number; // Для бури
  turnsUntilImpact?: number; // Ходов до формирования/удара
}

interface UpgradeTier {
  name: string;
  current: number;
  max: number;
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
  beavers?: BeaverLair[];
  meteoForecasts?: MeteoForecast[];
  plantationUpgrades: {
    points: number;
    tiers?: UpgradeTier[];
  };
}

const CameraSetup = ({
  target,
  hasData,
}: {
  target: [number, number, number];
  hasData: boolean;
}) => {
  const { camera } = useThree();
  const isInitialized = useRef(false);
  const prevTarget = useRef(target);

  useEffect(() => {
    // 1. Установка камеры при первой загрузке данных
    if (!isInitialized.current && hasData) {
      camera.position.set(target[0], 150, target[2] + 200);
      isInitialized.current = true;
      prevTarget.current = target;
      return;
    }

    // 2. Прыжок камеры при клике на другого юнита (сохраняем ракурс)
    if (
      isInitialized.current &&
      (prevTarget.current[0] !== target[0] ||
        prevTarget.current[2] !== target[2])
    ) {
      const dx = target[0] - prevTarget.current[0];
      const dz = target[2] - prevTarget.current[2];

      camera.position.set(
        camera.position.x + dx,
        camera.position.y,
        camera.position.z + dz,
      );
      prevTarget.current = target;
    }
  }, [target, camera, hasData]);

  return null;
};

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
    <Html position={[0, 0.2, 0]} center style={{ pointerEvents: "none" }}>
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
    actionRange = 0,
  } = arenaData;

  const isReinforcedCell = (x: number, y: number) => x % 7 === 0 && y % 7 === 0;

  const occupiedPositions = useMemo(() => {
    const occupied = new Set<string>();
    // Горы
    mountains.forEach(([x, y]) => occupied.add(`${x},${y}`));
    // Свои плантации
    plantations.forEach((p) => {
      const [x, y] = p.position;
      occupied.add(`${x},${y}`);
    });
    // Враги
    enemy.forEach((e) => {
      const [x, y] = e.position;
      occupied.add(`${x},${y}`);
    });
    // Бобры
    beavers.forEach((b) => {
      const [x, y] = b.position;
      occupied.add(`${x},${y}`);
    });
    return occupied;
  }, [mountains, plantations, enemy, beavers]);


  return (
    <>
      <ambientLight intensity={0.6} />
      <directionalLight
        position={[500, 400, -200]} // Подняли повыше и поставили под углом
        intensity={2}
        color="#fff5e6" // Теплый солнечный свет
        castShadow
        shadow-mapSize={[4096, 4096]} // Разрешение теней (можно 2048 для оптимизации)
        shadow-bias={-0.0005} // Спасает от артефактов "лесенки" на тенях
      >
        <orthographicCamera
          attach="shadow-camera"
          args={[-800, 800, 800, -800]}
          near={0.1}
          far={2000}
        />
      </directionalLight>

      {/* <Ground /> */}

      {/* Горы */}
      {mountains.map((pos) => (
        <Mountain scale={0.08} position={[pos[0], -0.1, pos[1]]} />
      ))}

      {/* Терраформированные клетки */}
      {cells.map((cell, idx) => {
        const degradation = cell.turnsUntilDegradation;
        const isReinforced = isReinforcedCell(
          cell.position[0],
          cell.position[1],
        );
         const cellKey = `${cell.position[0]},${cell.position[1]}`;
         const isOccupied = occupiedPositions.has(cellKey);

        return (
          <group
            key={`cell-${idx}`}
            position={[cell.position[0], 0, cell.position[1]]}
          >
            {/* Оставляем подложку, чтобы клетка выделялась цветом */}
            <Plane
              position={[0, -0.42, 0]}
              rotation={[-Math.PI / 2, 0, 0]}
              args={[1, 1]}
            >
              <meshBasicMaterial
                color={isReinforced ? "rgb(240, 196, 21)" : "#10d24a"}
                transparent
                opacity={0.6}
              />
            </Plane>

            {/* ДОБАВЛЯЕМ ТРАВУ */}
            {/* Если клетка не деградирует (или прогресс высокий), рендерим траву */}
            {cell.terraformationProgress > 10 && !isOccupied && (
              <group position={[0, -0.42, 0]}>
                <Grass scale={cell.terraformationProgress < 50 ? 0.15 : 0.3} />
              </group>
            )}
            <Html
              position={[0, -0.5, 0]}
              center
              style={{ pointerEvents: "none" }}
            >
              <div
                style={{
                  background: "rgba(0,0,0,0.6)",
                  color: "white",
                  fontSize: "10px",
                  padding: "2px 4px",
                  borderRadius: "3px",
                  fontFamily: "monospace",
                  whiteSpace: "nowrap",
                }}
              >
                🌱Прогресс: {cell.terraformationProgress}%{" "}
                {degradation > 0 ? `⏳${degradation}` : "⚠️Деградация"}
              </div>
            </Html>
          </group>
        );
      })}

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
            <Beaver scale={0.4} position={[0, -0, 0]} />;
            <FloatingUI hp={beaver.hp} maxHp={100} type="beaver" />
          </group>
        );
      })}

      {/* Свои плантации + Граница видимости (actionRange) */}
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
            {/* Отрисовка зоны действия/видимости (actionRange) */}
            {actionRange > 0 && !plant.isIsolated && (
              <group position={[0, -0.425, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                {/* Полупрозрачная заливка зоны */}
                <Circle args={[actionRange, 32]}>
                  <meshBasicMaterial color={color} transparent opacity={0.05} />
                </Circle>
                {/* Яркое кольцо по границе */}
                <Ring args={[actionRange - 0.1, actionRange, 32]}>
                  <meshBasicMaterial color={color} transparent opacity={0.3} />
                </Ring>
              </group>
            )}

            {plant.isMain ? (
              <Laboratory scale={0.01} position={[0, -0.45, 0]} />
            ) : (
              <Factory scale={0.25} position={[0.15, -0.5, 0]} />
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

  const [leftPanelCollapsed, setLeftPanelCollapsed] = useState(false);
  const [rightPanelCollapsed, setRightPanelCollapsed] = useState(false);

  const [focusedPos, setFocusedPos] = useState<[number, number, number] | null>(
    null,
  );

  const [error, setError] = useState<Error | AxiosError | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchArena = useCallback(async () => {
    try {
      const response = await axios.get<ArenaData>(API_URL, {
        headers: { "X-Auth-Token": AUTH_TOKEN },
      });

      // Чтобы избежать "Cascading renders", обновляем состояние ошибки только если она была
      setError((prev) => (prev === null ? null : null));
      setArenaData(response.data);
    } catch (err) {
      const axiosError = err as AxiosError;
      setError(axiosError);
      console.error("Ошибка получения данных арены:", axiosError.message);
    }
  }, []); // Зависимостей нет, функция стабильна

  useEffect(() => {
    const tick = async () => {
      if (isPaused) return;

      await fetchArena();

      // Планируем следующий запрос строго через 1000мс после завершения текущего
      timerRef.current = setTimeout(tick, 1000);
    };

    if (!isPaused) {
      timerRef.current = setTimeout(tick, 0);
    }

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [isPaused, fetchArena]);

  const controlsTarget = useMemo<[number, number, number]>(() => {
    // Если мы кликнули на юнита в меню — смотрим на него
    if (focusedPos) return focusedPos;

    if (
      !arenaData ||
      !arenaData.plantations ||
      arenaData.plantations.length === 0
    )
      return [400, 0, 300];

    const mainPlant =
      arenaData.plantations.find((p) => p.isMain) || arenaData.plantations[0];
    return mainPlant
      ? [mainPlant.position[0], 0, mainPlant.position[1]]
      : [400, 0, 300];
  }, [arenaData?.plantations, focusedPos]);

  const hasEarthquake = arenaData?.meteoForecasts?.some(
    (m) => m.type === "earthquake",
  );

  const upgradeTiers = arenaData?.plantationUpgrades?.tiers || [];

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
          ⚠️ Ошибка:{" "}
          {error instanceof AxiosError
            ? error.response?.statusText || error.message
            : error.message}
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
          padding: leftPanelCollapsed ? "8px 12px" : "15px",
          borderRadius: "8px",
          fontFamily: "monospace",
          minWidth: leftPanelCollapsed ? "auto" : "200px",
          transition: "all 0.2s ease",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <h2
            style={{
              margin: 0,
              fontSize: leftPanelCollapsed ? "16px" : "1.5rem",
            }}
          >
            DatsSol Radar
          </h2>
          <button
            onClick={() => setLeftPanelCollapsed(!leftPanelCollapsed)}
            style={{
              background: "none",
              border: "none",
              color: "white",
              fontSize: "18px",
              cursor: "pointer",
              marginLeft: "10px",
            }}
          >
            {leftPanelCollapsed ? "▶" : "▼"}
          </button>
        </div>

        {!leftPanelCollapsed && (
          <>
            <button
              onClick={() => setIsPaused(!isPaused)}
              style={{
                width: "100%",
                padding: "8px",
                margin: "15px 0 15px 0",
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
              {/* Всё содержимое, которое было внутри, оставляем без изменений */}
              <div>
                Ход:{" "}
                <strong style={{ color: "#00ff00" }}>
                  {arenaData?.turnNo || "..."}
                </strong>
              </div>
              <div>
                След. ход:{" "}
                <strong>
                  {isPaused
                    ? "Остановлено"
                    : `${arenaData?.nextTurnIn || 0} сек`}
                </strong>
              </div>
              <hr style={{ borderColor: "#444", margin: "10px 0" }} />
              <div>
                Очки апгрейдов:{" "}
                <strong>{arenaData?.plantationUpgrades?.points || 0}</strong>
              </div>
              {upgradeTiers.length > 0 && (
                <>
                  <div style={{ marginTop: "12px", marginBottom: "4px" }}>
                    🔧 Апгрейды:
                  </div>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(2, 1fr)",
                      gap: "6px 10px",
                      fontSize: "12px",
                      background: "rgba(255,255,255,0.1)",
                      padding: "8px",
                      borderRadius: "6px",
                      marginBottom: "10px",
                    }}
                  >
                    {upgradeTiers.map((tier, idx) => (
                      <div key={idx} style={{ whiteSpace: "nowrap" }}>
                        <span style={{ color: "#ffaa66" }}>{tier.name}</span>:{" "}
                        {tier.current}/{tier.max}
                      </div>
                    ))}
                  </div>
                </>
              )}
              <hr style={{ borderColor: "#444", margin: "10px 0" }} />
              <div>
                Дальность действий:{" "}
                <strong style={{ color: "#1e90ff" }}>
                  {arenaData?.actionRange || 0}
                </strong>
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
          </>
        )}
      </div>
      {/* Правая панель: Список твоих плантаций */}
      <div
        style={{
          position: "absolute",
          top: 20,
          right: 20,
          zIndex: 10,
          background: "rgba(0,0,0,0.7)",
          color: "white",
          padding: rightPanelCollapsed ? "8px 12px" : "15px",
          borderRadius: "8px",
          fontFamily: "monospace",
          width: rightPanelCollapsed ? "auto" : "220px",
          maxHeight: "80vh",
          display: "flex",
          flexDirection: "column",
          transition: "all 0.2s ease",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <h3 style={{ margin: 0 }}>
            Мои базы ({arenaData?.plantations?.length || 0}/30)
          </h3>
          <button
            onClick={() => setRightPanelCollapsed(!rightPanelCollapsed)}
            style={{
              background: "none",
              border: "none",
              color: "white",
              fontSize: "16px",
              cursor: "pointer",
              marginLeft: "10px",
            }}
          >
            {rightPanelCollapsed ? "◀" : "▼"}
          </button>
        </div>

        {!rightPanelCollapsed && (
          <div
            style={{
              overflowY: "auto",
              display: "flex",
              flexDirection: "column",
              gap: "5px",
              paddingRight: "5px",
              marginTop: "10px",
            }}
          >
            {arenaData?.plantations?.map((p) => (
              <button
                key={p.id}
                onClick={() => setFocusedPos([p.position[0], 0, p.position[1]])}
                style={{
                  background: p.isMain
                    ? "rgba(255, 0, 255, 0.2)"
                    : "rgba(30, 144, 255, 0.2)",
                  border: `1px solid ${p.isMain ? "#ff00ff" : "#1e90ff"}`,
                  color: "white",
                  padding: "8px",
                  borderRadius: "4px",
                  cursor: "pointer",
                  textAlign: "left",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  transition: "background 0.2s",
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.background = p.isMain
                    ? "rgba(255, 0, 255, 0.4)"
                    : "rgba(30, 144, 255, 0.4)")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.background = p.isMain
                    ? "rgba(255, 0, 255, 0.2)"
                    : "rgba(30, 144, 255, 0.2)")
                }
              >
                <span>{p.isMain ? "👑 ЦУ" : "🏭 База"}</span>
                <span style={{ fontSize: "12px", color: "#ccc" }}>
                  [{p.position[0]}, {p.position[1]}]
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      <Canvas
        style={{ background: "#020205" }} // Не чисто черный, а цвет глубокого космоса
        shadows
        camera={{ fov: 50, position: [10, 10, 10] }} // Камеру лучше поставить повыше
      >
        <SpaceBackground target={controlsTarget} />
        <VolumetricGround
          target={controlsTarget}
          mapSize={
            arenaData?.size
              ? [arenaData.size[0], arenaData.size[1]]
              : [1000, 1000]
          }
        />
        <PlanetSurface
          mapSize={
            arenaData?.size
              ? [arenaData.size[0], arenaData.size[1]]
              : [1000, 1000]
          }
        />
        {/* Освещение делаем контрастным */}
        <Environment preset="sunset" />
        <ambientLight intensity={0.4} color="#88aaff" />
        <directionalLight
          position={[500, 400, -200]} // Подняли повыше и поставили под углом
          intensity={2}
          color="#fff5e6" // Теплый солнечный свет
          castShadow
          shadow-mapSize={[4096, 4096]} // Разрешение теней (можно 2048 для оптимизации)
          shadow-bias={-0.0005} // Спасает от артефактов "лесенки" на тенях
        >
          {/* Увеличиваем зону покрытия тенями */}
          <orthographicCamera
            attach="shadow-camera"
            args={[-800, 800, 800, -800]}
            near={0.1}
            far={2000}
          />
        </directionalLight>
        {/* Подсветка планеты с обратной стороны (Reflected light) */}
        <pointLight position={[500, -100, 500]} intensity={2} color="#3366ff" />
        <CameraSetup target={controlsTarget} hasData={!!arenaData} />
        <OrbitControls
          enablePan={true}
          enableZoom={true}
          enableRotate={true}
          target={controlsTarget}
          maxPolarAngle={Math.PI / 2 - 0.05}
          minDistance={0}
          maxDistance={300}
          panSpeed={2.5}
          zoomSpeed={3.0}
          enableDamping={false}
        />
        <ArenaScene arenaData={arenaData} />
        {/* МАГИЯ КИНО: ПОСТ-ПРОЦЕССИНГ */}
        <EffectComposer disableNormalPass>
          {/* Bloom заставит светиться все яркие цвета (Ваши лазеры, неон, UI) */}
          <Bloom
            luminanceThreshold={1} // Светится только то, что ярче 1
            mipmapBlur
            intensity={1.5}
          />
          <Vignette eskil={false} offset={0.1} darkness={0.8} />
        </EffectComposer>
      </Canvas>
    </div>
  );
}
