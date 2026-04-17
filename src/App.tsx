import { useState, useEffect, useMemo, useRef } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { OrbitControls, Box, Plane, Edges } from "@react-three/drei";
import axios from "axios";

const API_URL = "https://games-test.datsteam.dev/api/arena";
const AUTH_TOKEN = import.meta.env.VITE_API_TOKEN; // Подставьте ваш токен
// Компонент для автоматической установки камеры на Главную базу (ЦУ)
const CameraSetup = ({ plantations }) => {
  const { camera } = useThree();
  const isCameraSet = useRef(false);

  useEffect(() => {
    // Центрируем камеру только один раз при первой успешной загрузке плантаций
    if (!isCameraSet.current && plantations && plantations.length > 0) {
      const mainPlant = plantations.find((p) => p.isMain) || plantations[0];
      if (mainPlant) {
        const [x, y] = mainPlant.position;
        // Устанавливаем камеру немного сзади и сверху от базы (изометрический вид)
        camera.position.set(x, 20, y + 20);
        isCameraSet.current = true;
      }
    }
  }, [plantations, camera]);

  return null;
};

// Компонент пустыни и сетки координат
const Ground = () => (
  <group>
    <Plane
      args={[2000, 2000]}
      rotation={[-Math.PI / 2, 0, 0]}
      position={[500, -0.5, 500]}
    >
      <meshStandardMaterial color="#d2b48c" />
    </Plane>
    {/* Сетка размером 1000x1000 клеток, сдвинутая так, чтобы покрывать положительные координаты */}
    <gridHelper
      args={[1000, 1000, "#a0522d", "#cdaa7d"]}
      position={[500, -0.49, 500]}
    />
  </group>
);




// Компонент отрисовки игровых объектов
const ArenaScene = ({ arenaData }) => {
  if (!arenaData) return null;

  const {
    plantations = [],
    enemy = [],
    mountains = [],
    cells = [],
  } = arenaData;

  // Проверка на "усиленную" клетку (кратны 7)
  const isReinforcedCell = (x, y) => x % 7 === 0 && y % 7 === 0;

  return (
    <>
      <ambientLight intensity={0.6} />
      <directionalLight position={[50, 100, 20]} intensity={1.2} castShadow />

      <Ground />

      {/* Отрисовка гор */}
      {mountains.map((pos, idx) => (
        <Box
          key={`mountain-${idx}`}
          position={[pos[0], 0, pos[1]]}
          args={[1, 1, 1]}
        >
          <meshStandardMaterial color="#555555" />
          <Edges color="#222222" /> {/* Контуры для читаемости */}
        </Box>
      ))}

      {/* Отрисовка терраформированных клеток */}
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
                ? "#32cd32"
                : "#8fbc8f"
            }
            transparent
            opacity={0.8}
          />
        </Plane>
      ))}

      {/* Отрисовка плантаций игрока */}
      {plantations.map((plant) => {
        const [x, y] = plant.position;
        let color = "#1e90ff"; // Обычная (синяя)
        let height = 0.8;

        if (plant.isMain) {
          color = "#ff00ff"; // ЦУ (пурпурный)
          height = 1.5;
        } else if (plant.isIsolated) {
          color = "#888888"; // Изолированная (серая)
        }

        return (
          <Box
            key={`plant-${plant.id}`}
            position={[x, height / 2, y]}
            args={[0.8, height, 0.8]}
          >
            <meshStandardMaterial color={color} />
            <Edges color="#ffffff" /> {/* Белые края для своих зданий */}
          </Box>
        );
      })}

      {/* Отрисовка вражеских плантаций */}
      {enemy.map((en) => {
        const [x, y] = en.position;
        return (
          <Box
            key={`enemy-${en.id}`}
            position={[x, 0.4, y]}
            args={[0.8, 0.8, 0.8]}
          >
            <meshStandardMaterial color="#ff4500" />
            <Edges color="#000000" /> {/* Черные края для врагов */}
          </Box>
        );
      })}
    </>
  );
};

export default function DatsSolMap() {
  const [arenaData, setArenaData] = useState(null);

  useEffect(() => {
    const fetchArena = async () => {
      try {
        const response = await axios.get(API_URL, {
          headers: { "X-Auth-Token": AUTH_TOKEN },
        });
        setArenaData(response.data);
      } catch (error) {
        console.error("Ошибка получения данных арены:", error);
      }
    };

    fetchArena();
    const interval = setInterval(fetchArena, 1000);
    return () => clearInterval(interval);
  }, []);

  // Вычисляем точку, вокруг которой будет вращаться камера (фокус на ЦУ)
  const controlsTarget = useMemo(() => {
    if (!arenaData || !arenaData.plantations) return [400, 0, 300];
    const mainPlant =
      arenaData.plantations.find((p) => p.isMain) || arenaData.plantations[0];
    return mainPlant
      ? [mainPlant.position[0], 0, mainPlant.position[1]]
      : [400, 0, 300];
  }, [arenaData?.plantations]);

  return (
    <div style={{ width: "100vw", height: "100vh", background: "#111" }}>
      {/* UI Панель */}
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
        }}
      >
        <h2 style={{ margin: "0 0 10px 0" }}>DatsSol Radar</h2>
        <div style={{ fontSize: "14px", lineHeight: "1.5" }}>
          <div>
            Ход:{" "}
            <strong style={{ color: "#00ff00" }}>
              {arenaData?.turnNo || "..."}
            </strong>
          </div>
          <div>
            След. ход через: <strong>{arenaData?.nextTurnIn || 0} сек</strong>
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
            Врагов в зоне видимости:{" "}
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
          maxPolarAngle={Math.PI / 2 - 0.05} // Запрещаем камере опускаться под землю
          minDistance={5} // Запрещаем зумить сквозь текстуры
          maxDistance={150} // Ограничиваем отдаление
        />
        <ArenaScene arenaData={arenaData} />
      </Canvas>
    </div>
  );
}
