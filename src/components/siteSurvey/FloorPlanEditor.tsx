import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Group, Layer, Line, Rect, Stage, Text, Transformer } from "react-konva";
import type Konva from "konva";
import { notifications } from "../../services/notification.service";
import type {
  SurveyCatalogDevice,
  SurveyDeviceLayout,
  SurveyLayout,
  SurveyWall,
  SurveyZoneLayout,
  SurveyZoneOption,
} from "../../types/siteSurveyExecution.types";
import Toolbar, { type FloorPlanMode } from "./Toolbar";

const GRID = 24;
const CANVAS_WIDTH = 1248;
const CANVAS_HEIGHT = 840;
const MIN_ZONE_SIZE = GRID * 2;

const ZONE_PALETTE = [
  { fill: "rgba(219,234,254,0.55)", stroke: "#60a5fa", text: "#1d4ed8" },
  { fill: "rgba(220,252,231,0.55)", stroke: "#4ade80", text: "#15803d" },
  { fill: "rgba(254,243,199,0.55)", stroke: "#fbbf24", text: "#b45309" },
  { fill: "rgba(254,226,226,0.55)", stroke: "#f87171", text: "#b91c1c" },
  { fill: "rgba(233,213,255,0.55)", stroke: "#c084fc", text: "#7e22ce" },
  { fill: "rgba(209,250,229,0.55)", stroke: "#34d399", text: "#047857" },
  { fill: "rgba(254,215,170,0.55)", stroke: "#fb923c", text: "#c2410c" },
];

type SelectableType = "wall" | "zone" | "device";

interface FloorPlanEditorProps {
  surveyId: string;
  layout: SurveyLayout;
  zonesCatalog: SurveyZoneOption[];
  devicesCatalog: SurveyCatalogDevice[];
  onLayoutChange: (layout: SurveyLayout) => void;
  onManualSave: () => void;
  manualSaving: boolean;
  autosaveLabel: string;
  showSave?: boolean;
  restrictToDevices?: boolean;
}

interface LayoutSnapshot {
  walls: SurveyWall[];
  zones: SurveyZoneLayout[];
  devices: SurveyDeviceLayout[];
}

const snap = (value: number) => Math.round(value / GRID) * GRID;
const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

function findZoneAtPoint(x: number, y: number, zones: SurveyZoneLayout[]): SurveyZoneLayout | null {
  return zones.find((zone) => x >= zone.x && x <= zone.x + zone.width && y >= zone.y && y <= zone.y + zone.height) ?? null;
}

function cloneSnapshot(snapshot: LayoutSnapshot): LayoutSnapshot {
  return {
    walls: snapshot.walls.map((wall) => ({ ...wall, points: [...wall.points] as [number, number, number, number] })),
    zones: snapshot.zones.map((zone) => ({ ...zone })),
    devices: snapshot.devices.map((device) => ({ ...device })),
  };
}

function createSnapshot(
  walls: SurveyWall[],
  zones: SurveyZoneLayout[],
  devices: SurveyDeviceLayout[]
): LayoutSnapshot {
  return cloneSnapshot({ walls, zones, devices });
}

function GridLayer({ visible }: { visible: boolean }) {
  if (!visible) return null;

  const lines: React.ReactNode[] = [];

  for (let x = 0; x <= CANVAS_WIDTH; x += GRID) {
    lines.push(
      <Line key={`vx-${x}`} points={[x, 0, x, CANVAS_HEIGHT]} stroke="#f1f5f9" strokeWidth={1} listening={false} />
    );
  }

  for (let y = 0; y <= CANVAS_HEIGHT; y += GRID) {
    lines.push(
      <Line key={`hy-${y}`} points={[0, y, CANVAS_WIDTH, y]} stroke="#f1f5f9" strokeWidth={1} listening={false} />
    );
  }

  return <Layer>{lines}</Layer>;
}

function getPointer(stage: Konva.Stage | null): { x: number; y: number } | null {
  if (!stage) return null;
  const pointer = stage.getPointerPosition();
  if (!pointer) return null;
  return { x: snap(pointer.x), y: snap(pointer.y) };
}

function resolveDeviceLabel(deviceId: string, catalog: SurveyCatalogDevice[]): string {
  const match = catalog.find((item) => item.id === deviceId);
  return match?.name ?? "Equipo";
}

function isPointInsideZone(x: number, y: number, zone: Pick<SurveyZoneLayout, "x" | "y" | "width" | "height">): boolean {
  return x >= zone.x && x <= zone.x + zone.width && y >= zone.y && y <= zone.y + zone.height;
}

export default function FloorPlanEditor({
  surveyId,
  layout,
  zonesCatalog,
  devicesCatalog,
  onLayoutChange,
  onManualSave,
  manualSaving,
  autosaveLabel,
  showSave = true,
  restrictToDevices = false,
}: FloorPlanEditorProps) {
  const stageRef = useRef<Konva.Stage | null>(null);
  const zoneTransformerRef = useRef<Konva.Transformer | null>(null);
  const zoneNodeRefs = useRef<Record<string, Konva.Group | null>>({});

  const [mode, setMode] = useState<FloorPlanMode>("select");
  const [showGrid, setShowGrid] = useState(true);

  const [walls, setWalls] = useState<SurveyWall[]>(layout.walls);
  const [zones, setZones] = useState<SurveyZoneLayout[]>(layout.zones);
  const [devices, setDevices] = useState<SurveyDeviceLayout[]>(layout.devices);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<SelectableType | null>(null);

  const [selectedZoneId, setSelectedZoneId] = useState<string>(zonesCatalog[0]?.id ?? "");
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>(devicesCatalog[0]?.id ?? "");

  const [drawingWall, setDrawingWall] = useState<{ start: { x: number; y: number }; end: { x: number; y: number } } | null>(null);
  const [drawingZone, setDrawingZone] = useState<{ start: { x: number; y: number }; end: { x: number; y: number } } | null>(null);

  const [draggingZoneId, setDraggingZoneId] = useState<string | null>(null);
  const [draggingDeviceId, setDraggingDeviceId] = useState<string | null>(null);

  const historyRef = useRef<LayoutSnapshot[]>([]);
  const historyIndexRef = useRef(-1);

  const initializeLayout = useCallback((seed: SurveyLayout) => {
    setWalls(seed.walls);
    setZones(seed.zones);
    setDevices(seed.devices);
    setSelectedId(null);
    setSelectedType(null);
    historyRef.current = [createSnapshot(seed.walls, seed.zones, seed.devices)];
    historyIndexRef.current = 0;
  }, []);

  useEffect(() => {
    initializeLayout(layout);
  }, [surveyId, layout, initializeLayout]);

  useEffect(() => {
    if (!selectedZoneId && zonesCatalog.length > 0) {
      setSelectedZoneId(zonesCatalog[0].id);
    }
  }, [selectedZoneId, zonesCatalog]);

  useEffect(() => {
    if (!selectedDeviceId && devicesCatalog.length > 0) {
      setSelectedDeviceId(devicesCatalog[0].id);
    }
  }, [devicesCatalog, selectedDeviceId]);

  useEffect(() => {
    onLayoutChange({ walls, zones, devices });
  }, [walls, zones, devices, onLayoutChange]);

  useEffect(() => {
    const transformer = zoneTransformerRef.current;
    if (!transformer) return;

    if (selectedType !== "zone" || !selectedId || mode !== "select") {
      transformer.nodes([]);
      transformer.getLayer()?.batchDraw();
      return;
    }

    const node = zoneNodeRefs.current[selectedId];
    if (!node) {
      transformer.nodes([]);
      transformer.getLayer()?.batchDraw();
      return;
    }

    transformer.nodes([node]);
    transformer.getLayer()?.batchDraw();
  }, [mode, selectedId, selectedType, zones]);

  const setLayout = useCallback(
    (nextWalls: SurveyWall[], nextZones: SurveyZoneLayout[], nextDevices: SurveyDeviceLayout[], recordHistory = true) => {
      setWalls(nextWalls);
      setZones(nextZones);
      setDevices(nextDevices);

      if (recordHistory) {
        const base = historyRef.current.slice(0, historyIndexRef.current + 1);
        base.push(createSnapshot(nextWalls, nextZones, nextDevices));
        historyRef.current = base;
        historyIndexRef.current = base.length - 1;
      }
    },
    []
  );

  const undo = useCallback(() => {
    if (historyIndexRef.current <= 0) return;
    historyIndexRef.current -= 1;
    const snapshot = historyRef.current[historyIndexRef.current];
    if (!snapshot) return;
    setLayout(snapshot.walls, snapshot.zones, snapshot.devices, false);
    setSelectedId(null);
    setSelectedType(null);
  }, [setLayout]);

  const redo = useCallback(() => {
    if (historyIndexRef.current >= historyRef.current.length - 1) return;
    historyIndexRef.current += 1;
    const snapshot = historyRef.current[historyIndexRef.current];
    if (!snapshot) return;
    setLayout(snapshot.walls, snapshot.zones, snapshot.devices, false);
    setSelectedId(null);
    setSelectedType(null);
  }, [setLayout]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "z") {
        event.preventDefault();
        if (event.shiftKey) {
          redo();
        } else {
          undo();
        }
        return;
      }

      if ((event.key === "Delete" || event.key === "Backspace") && selectedId && selectedType) {
        event.preventDefault();
        if (restrictToDevices && (selectedType === "wall" || selectedType === "zone")) {
          return;
        }
        let nextWalls = walls;
        let nextZones = zones;
        let nextDevices = devices;

        if (selectedType === "wall") {
          nextWalls = walls.filter((wall) => wall.id !== selectedId);
        }

        if (selectedType === "zone") {
          nextZones = zones.filter((zone) => zone.id !== selectedId);
          const validZoneIds = new Set(nextZones.map((zone) => zone.id));
          nextDevices = devices.map((device) => ({
            ...device,
            zoneId: device.zoneId && validZoneIds.has(device.zoneId) ? device.zoneId : null,
          }));
        }

        if (selectedType === "device") {
          nextDevices = devices.filter((device) => device.id !== selectedId);
        }

        setLayout(nextWalls, nextZones, nextDevices, true);
        setSelectedId(null);
        setSelectedType(null);
      }

      if (event.key === "Escape") {
        setDrawingWall(null);
        setDrawingZone(null);
        setMode("select");
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [devices, redo, selectedId, selectedType, setLayout, undo, walls, zones]);

  const commitWallDrag = useCallback(
    (wallId: string, dx: number, dy: number) => {
      const nextWalls = walls.map((wall) => {
        if (wall.id !== wallId) return wall;
        const movedPoints: [number, number, number, number] = [
          snap(wall.points[0] + dx),
          snap(wall.points[1] + dy),
          snap(wall.points[2] + dx),
          snap(wall.points[3] + dy),
        ];
        return { ...wall, points: movedPoints };
      });
      setLayout(nextWalls, zones, devices, true);
    },
    [devices, setLayout, walls, zones]
  );

  const commitZoneDrag = useCallback(
    (zoneId: string, nextX: number, nextY: number) => {
      const currentZone = zones.find((zone) => zone.id === zoneId);
      if (!currentZone) return;

      const clampedX = clamp(snap(nextX), 0, CANVAS_WIDTH - currentZone.width);
      const clampedY = clamp(snap(nextY), 0, CANVAS_HEIGHT - currentZone.height);
      const dx = clampedX - currentZone.x;
      const dy = clampedY - currentZone.y;

      const nextZones = zones.map((zone) => {
        if (zone.id !== zoneId) return zone;
        return { ...zone, x: clampedX, y: clampedY };
      });

      const nextDevices = devices.map((device) => {
        if (device.zoneId !== zoneId) return device;
        return {
          ...device,
          x: snap(device.x + dx),
          y: snap(device.y + dy),
        };
      });

      setLayout(walls, nextZones, nextDevices, true);
    },
    [devices, setLayout, walls, zones]
  );

  const commitZoneResize = useCallback(
    (zoneId: string, nextZone: Pick<SurveyZoneLayout, "x" | "y" | "width" | "height">) => {
      const clampedX = clamp(snap(nextZone.x), 0, CANVAS_WIDTH - MIN_ZONE_SIZE);
      const clampedY = clamp(snap(nextZone.y), 0, CANVAS_HEIGHT - MIN_ZONE_SIZE);
      const clampedWidth = clamp(snap(nextZone.width), MIN_ZONE_SIZE, CANVAS_WIDTH - clampedX);
      const clampedHeight = clamp(snap(nextZone.height), MIN_ZONE_SIZE, CANVAS_HEIGHT - clampedY);

      const resizedZone = { x: clampedX, y: clampedY, width: clampedWidth, height: clampedHeight };

      const devicesOutsideZone = devices.some((device) => {
        if (device.zoneId !== zoneId) return false;
        return !isPointInsideZone(device.x, device.y, resizedZone);
      });

      if (devicesOutsideZone) {
        notifications.warning({
          title: "No se pudo redimensionar",
          description: "La zona no puede encogerse dejando dispositivos fuera.",
        });
        setLayout(walls, zones.map((zone) => ({ ...zone })), devices, false);
        return;
      }

      const nextZones = zones.map((zone) => {
        if (zone.id !== zoneId) return zone;
        return { ...zone, ...resizedZone };
      });

      setLayout(walls, nextZones, devices, true);
    },
    [devices, setLayout, walls, zones]
  );

  // FIX: Los dispositivos tienen posición absoluta en el estado (device.x, device.y).
  // Konva mueve el nodo relativamente al hacer drag, por lo que event.target.x() es un
  // delta acumulado, NO la posición absoluta. Calculamos la posición real sumando ese
  // delta a la posición original en el estado, y luego reseteamos el nodo a (0,0).
  const commitDeviceDrag = useCallback(
    (deviceId: string, deltaX: number, deltaY: number) => {
      const currentDevice = devices.find((d) => d.id === deviceId);
      if (!currentDevice) return;

      const absoluteX = snap(currentDevice.x + deltaX);
      const absoluteY = snap(currentDevice.y + deltaY);

      const targetZone = findZoneAtPoint(absoluteX, absoluteY, zones);
      if (!targetZone) {
        notifications.warning({
          title: "Zona requerida",
          description: "El dispositivo debe quedar dentro de una zona del plano.",
        });
        return;
      }

      const nextDevices = devices.map((device) => {
        if (device.id !== deviceId) return device;
        return { ...device, x: absoluteX, y: absoluteY, zoneId: targetZone.id };
      });

      setLayout(walls, zones, nextDevices, true);
    },
    [devices, setLayout, walls, zones]
  );

  const addZoneFromCatalog = useCallback(
    (zoneCatalogId: string, x: number, y: number) => {
      const zoneCatalog = zonesCatalog.find((zone) => zone.id === zoneCatalogId);
      if (!zoneCatalog) return;

      const exists = zones.some((zone) => zone.sourceZoneId === zoneCatalog.id || zone.id === zoneCatalog.id);
      if (exists) {
        notifications.info({
          title: "Zona ya colocada",
          description: "Esa zona ya esta en el plano.",
        });
        return;
      }

      const width = GRID * 9;
      const height = GRID * 7;
      const nextZones = [
        ...zones,
        {
          id: zoneCatalog.id,
          name: zoneCatalog.name,
          x: snap(x - width / 2),
          y: snap(y - height / 2),
          width,
          height,
          colorIdx: zones.length,
          sourceZoneId: zoneCatalog.id,
        },
      ];

      setLayout(walls, nextZones, devices, true);
    },
    [devices, setLayout, walls, zones, zonesCatalog]
  );

  const addDeviceToCanvas = useCallback(
    (deviceCatalogId: string, x: number, y: number) => {
      const zone = findZoneAtPoint(x, y, zones);
      if (!zone) {
        notifications.warning({
          title: "Zona requerida",
          description: "Debes colocar el dispositivo dentro de una zona.",
        });
        return;
      }

      const label = resolveDeviceLabel(deviceCatalogId, devicesCatalog);
      const nextDevices = [
        ...devices,
        {
          id: crypto.randomUUID(),
          deviceId: deviceCatalogId,
          label,
          x: snap(x),
          y: snap(y),
          zoneId: zone.id,
        },
      ];

      setLayout(walls, zones, nextDevices, true);
    },
    [devices, devicesCatalog, setLayout, walls, zones]
  );

  const handleStageMouseMove = () => {
    const pointer = getPointer(stageRef.current);

    if (drawingWall && pointer) {
      setDrawingWall((current) => (current ? { ...current, end: pointer } : null));
    }

    if (drawingZone && pointer) {
      setDrawingZone((current) => (current ? { ...current, end: pointer } : null));
    }
  };

  const handleStageClick = (event: Konva.KonvaEventObject<MouseEvent>) => {
    const stage = stageRef.current;
    if (!stage) return;

    const isCanvas = event.target === stage;
    const pointer = getPointer(stage);

    if (mode === "select") {
      if (isCanvas) {
        setSelectedId(null);
        setSelectedType(null);
      }
      return;
    }

    if (!pointer) return;

    if (mode === "draw-wall" && isCanvas) {
      if (restrictToDevices) return;
      if (!drawingWall) {
        setDrawingWall({ start: pointer, end: pointer });
      } else {
        const points: [number, number, number, number] = [
          drawingWall.start.x,
          drawingWall.start.y,
          pointer.x,
          pointer.y,
        ];
        const nextWalls = [...walls, { id: crypto.randomUUID(), points }];
        setLayout(nextWalls, zones, devices, true);
        setDrawingWall(null);
      }
      return;
    }

    if (mode === "add-device" && isCanvas) {
      if (!selectedDeviceId) {
        notifications.warning({
          title: "Selecciona un dispositivo",
          description: "Escoge un dispositivo del catalogo para colocarlo en el plano.",
        });
        return;
      }
      addDeviceToCanvas(selectedDeviceId, pointer.x, pointer.y);
    }
  };

  const handleStageMouseDown = (event: Konva.KonvaEventObject<MouseEvent>) => {
    if (mode !== "draw-zone") return;
    if (restrictToDevices) return;
    const stage = stageRef.current;
    if (!stage || event.target !== stage) return;

    const pointer = getPointer(stage);
    if (!pointer) return;

    setDrawingZone({ start: pointer, end: pointer });
  };

  const handleStageMouseUp = () => {
    if (!drawingZone) return;
    if (restrictToDevices) {
      setDrawingZone(null);
      return;
    }

    const x = Math.min(drawingZone.start.x, drawingZone.end.x);
    const y = Math.min(drawingZone.start.y, drawingZone.end.y);
    const width = Math.abs(drawingZone.end.x - drawingZone.start.x);
    const height = Math.abs(drawingZone.end.y - drawingZone.start.y);

    setDrawingZone(null);

    if (width < GRID * 2 || height < GRID * 2) return;

    const zoneCatalog = selectedZoneId ? zonesCatalog.find((zone) => zone.id === selectedZoneId) : null;

    if (zoneCatalog) {
      const exists = zones.some((zone) => zone.sourceZoneId === zoneCatalog.id || zone.id === zoneCatalog.id);
      if (exists) {
        notifications.info({
          title: "Zona ya colocada",
          description: "Selecciona otra zona o mueve la existente.",
        });
        return;
      }
    }

    const newZone: SurveyZoneLayout = {
      id: zoneCatalog?.id ?? crypto.randomUUID(),
      name: zoneCatalog?.name ?? `Zona libre ${zones.length + 1}`,
      x: snap(x),
      y: snap(y),
      width: snap(width),
      height: snap(height),
      colorIdx: zones.length,
      sourceZoneId: zoneCatalog?.id ?? null,
    };

    setLayout(walls, [...zones, newZone], devices, true);
  };

  const handleCanvasDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();

    const stage = stageRef.current;
    if (!stage) return;

    stage.setPointersPositions(event);
    const pointer = getPointer(stage);
    if (!pointer) return;

    if (draggingZoneId && !restrictToDevices) {
      addZoneFromCatalog(draggingZoneId, pointer.x, pointer.y);
      setDraggingZoneId(null);
      return;
    }

    if (draggingDeviceId) {
      addDeviceToCanvas(draggingDeviceId, pointer.x, pointer.y);
      setDraggingDeviceId(null);
    }
  };

  const placedZoneIds = useMemo(() => {
    return new Set(
      zones
        .map((zone) => zone.sourceZoneId)
        .filter((zoneId): zoneId is string => Boolean(zoneId))
    );
  }, [zones]);

  const availableZones = useMemo(
    () => zonesCatalog.filter((zone) => !placedZoneIds.has(zone.id)),
    [placedZoneIds, zonesCatalog]
  );

  const ghostWall = drawingWall ? (
    <Line
      points={[drawingWall.start.x, drawingWall.start.y, drawingWall.end.x, drawingWall.end.y]}
      stroke="#3b82f6"
      dash={[6, 4]}
      strokeWidth={2}
      listening={false}
    />
  ) : null;

  const ghostZone = drawingZone ? (
    <Rect
      x={Math.min(drawingZone.start.x, drawingZone.end.x)}
      y={Math.min(drawingZone.start.y, drawingZone.end.y)}
      width={Math.abs(drawingZone.end.x - drawingZone.start.x)}
      height={Math.abs(drawingZone.end.y - drawingZone.start.y)}
      fill="rgba(59,130,246,0.1)"
      stroke="#3b82f6"
      dash={[5, 3]}
      strokeWidth={1.5}
      listening={false}
    />
  ) : null;

  const selectedInfo = useMemo(() => {
    if (!selectedId || !selectedType) return "Sin seleccion";
    if (selectedType === "zone") {
      const zone = zones.find((item) => item.id === selectedId);
      return zone ? `Zona: ${zone.name} (${zone.width} x ${zone.height})` : "Zona";
    }
    if (selectedType === "device") {
      const device = devices.find((item) => item.id === selectedId);
      return device ? `Dispositivo: ${device.label}` : "Dispositivo";
    }
    return "Pared";
  }, [devices, selectedId, selectedType, zones]);

  const canUndo = historyIndexRef.current > 0;
  const canRedo = historyIndexRef.current < historyRef.current.length - 1;

  return (
    <section className="h-full rounded-2xl border border-slate-200 bg-white shadow-sm">
      <Toolbar
        mode={mode}
        onModeChange={(next) => {
          if (restrictToDevices && (next === "draw-wall" || next === "draw-zone")) return;
          setMode(next);
        }}
        showGrid={showGrid}
        onToggleGrid={() => setShowGrid((current) => !current)}
        onUndo={undo}
        onRedo={redo}
        canUndo={canUndo}
        canRedo={canRedo}
        zoneOptions={zonesCatalog.map((zone) => ({ id: zone.id, name: zone.name }))}
        selectedZoneId={selectedZoneId}
        onSelectZone={setSelectedZoneId}
        deviceOptions={devicesCatalog.map((device) => ({ id: device.id, name: device.label }))}
        selectedDeviceId={selectedDeviceId}
        onSelectDevice={setSelectedDeviceId}
        onManualSave={onManualSave}
        manualSaving={manualSaving}
        autosaveLabel={autosaveLabel}
        showSave={showSave}
        showWallTools={!restrictToDevices}
        showZoneTools={!restrictToDevices}
        showZoneSelector={!restrictToDevices}
      />

      <div className="grid min-h-[760px] grid-cols-[260px_1fr]">
        <aside className="border-r border-slate-200 bg-slate-50 p-3">
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Zonas del sitio</h3>
            <div className="mt-2 space-y-2">
              {availableZones.length === 0 ? (
                <p className="rounded-lg border border-slate-200 bg-white px-2 py-2 text-xs text-slate-500">
                  Todas las zonas fueron colocadas.
                </p>
              ) : (
                availableZones.map((zone) => (
                  <button
                    key={zone.id}
                    type="button"
                    draggable={!restrictToDevices}
                    onDragStart={() => {
                      if (restrictToDevices) return;
                      setDraggingZoneId(zone.id);
                    }}
                    onDragEnd={() => {
                      if (restrictToDevices) return;
                      setDraggingZoneId(null);
                    }}
                    onClick={() => setSelectedZoneId(zone.id)}
                    className={`w-full rounded-lg border bg-white px-2 py-2 text-left text-xs font-medium transition ${
                      selectedZoneId === zone.id
                        ? "border-blue-500 text-blue-700"
                        : "border-slate-200 text-slate-700 hover:border-slate-300"
                    }`}
                  >
                    {zone.name}
                  </button>
                ))
              )}
            </div>
          </div>

          <div className="mt-5">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Dispositivos</h3>
            <div className="mt-2 max-h-64 space-y-2 overflow-y-auto pr-1">
              {devicesCatalog.length === 0 ? (
                <p className="rounded-lg border border-slate-200 bg-white px-2 py-2 text-xs text-slate-500">
                  No hay dispositivos registrados para esta compania.
                </p>
              ) : (
                devicesCatalog.map((device) => (
                  <button
                    key={device.id}
                    type="button"
                    draggable
                    onDragStart={() => setDraggingDeviceId(device.id)}
                    onDragEnd={() => setDraggingDeviceId(null)}
                    onClick={() => setSelectedDeviceId(device.id)}
                    className={`w-full rounded-lg border bg-white px-2 py-2 text-left text-xs transition ${
                      selectedDeviceId === device.id
                        ? "border-emerald-500 text-emerald-700"
                        : "border-slate-200 text-slate-700 hover:border-slate-300"
                    }`}
                  >
                    <p className="font-semibold">{device.name}</p>
                    <p className="text-[10px] text-slate-500">{device.model || "Sin modelo"}</p>
                  </button>
                ))
              )}
            </div>
          </div>

          <div className="mt-5 space-y-2 rounded-lg border border-slate-200 bg-white p-2">
            <p className="text-[11px] font-semibold text-slate-600">Seleccion</p>
            <p className="text-xs text-slate-700">{selectedInfo}</p>
            <p className="text-[11px] text-slate-500">
              Tip: arrastra zonas/dispositivos al plano y usa las esquinas azules para cambiar el tamano.
            </p>
          </div>
        </aside>

        <div
          className="overflow-auto bg-white"
          onDragOver={(event) => event.preventDefault()}
          onDrop={handleCanvasDrop}
        >
          <div className="min-w-[1248px] p-3">
            <Stage
              ref={(node) => {
                stageRef.current = node;
              }}
              width={CANVAS_WIDTH}
              height={CANVAS_HEIGHT}
              onMouseMove={handleStageMouseMove}
              onClick={handleStageClick}
              onMouseDown={handleStageMouseDown}
              onMouseUp={handleStageMouseUp}
              className="rounded-xl border border-slate-200 bg-white"
            >
              <GridLayer visible={showGrid} />

              <Layer>
                {zones.map((zone, index) => {
                  const palette = ZONE_PALETTE[zone.colorIdx % ZONE_PALETTE.length];
                  const isSelected = selectedType === "zone" && selectedId === zone.id;
                  return (
                    <Group
                      key={zone.id}
                      ref={(node) => {
                        zoneNodeRefs.current[zone.id] = node;
                      }}
                      x={zone.x}
                      y={zone.y}
                      draggable={mode === "select" && !restrictToDevices}
                      onDragEnd={(event) => {
                        if (restrictToDevices) return;
                        commitZoneDrag(zone.id, event.target.x(), event.target.y());
                      }}
                      onTransformEnd={(event) => {
                        if (restrictToDevices) return;
                        const node = event.target as Konva.Group;
                        const nextZone = {
                          x: node.x(),
                          y: node.y(),
                          width: zone.width * node.scaleX(),
                          height: zone.height * node.scaleY(),
                        };
                        node.scaleX(1);
                        node.scaleY(1);
                        commitZoneResize(zone.id, nextZone);
                      }}
                      onClick={() => {
                        setSelectedId(zone.id);
                        setSelectedType("zone");
                      }}
                      onTap={() => {
                        setSelectedId(zone.id);
                        setSelectedType("zone");
                      }}
                    >
                      <Rect
                        width={zone.width}
                        height={zone.height}
                        fill={palette.fill}
                        stroke={isSelected ? "#2563eb" : palette.stroke}
                        strokeWidth={isSelected ? 2.5 : 1.5}
                        cornerRadius={4}
                      />
                      <Text
                        x={8}
                        y={8}
                        text={zone.name}
                        fontSize={11}
                        fill={palette.text}
                        listening={false}
                      />
                      <Text
                        x={8}
                        y={zone.height - 16}
                        text={`#${index + 1}`}
                        fontSize={10}
                        fill={palette.stroke}
                        listening={false}
                      />
                    </Group>
                  );
                })}
                <Transformer
                  ref={zoneTransformerRef}
                  rotateEnabled={false}
                  flipEnabled={false}
                  enabledAnchors={[
                    "top-left",
                    "top-center",
                    "top-right",
                    "middle-right",
                    "bottom-right",
                    "bottom-center",
                    "bottom-left",
                    "middle-left",
                  ]}
                  borderStroke="#2563eb"
                  borderStrokeWidth={1.5}
                  anchorStroke="#2563eb"
                  anchorFill="#ffffff"
                  anchorCornerRadius={999}
                  anchorSize={10}
                  boundBoxFunc={(_, newBox) => {
                    const x = clamp(snap(newBox.x), 0, CANVAS_WIDTH - MIN_ZONE_SIZE);
                    const y = clamp(snap(newBox.y), 0, CANVAS_HEIGHT - MIN_ZONE_SIZE);
                    const width = clamp(snap(newBox.width), MIN_ZONE_SIZE, CANVAS_WIDTH - x);
                    const height = clamp(snap(newBox.height), MIN_ZONE_SIZE, CANVAS_HEIGHT - y);
                    return { ...newBox, x, y, width, height };
                  }}
                />
                {ghostZone}
              </Layer>

              <Layer>
                {walls.map((wall) => {
                  const isSelected = selectedType === "wall" && selectedId === wall.id;
                  return (
                    <Line
                      key={wall.id}
                      points={wall.points}
                      stroke={isSelected ? "#2563eb" : "#334155"}
                      strokeWidth={isSelected ? 4 : 3}
                      lineCap="round"
                      lineJoin="round"
                      draggable={mode === "select" && !restrictToDevices}
                      onDragEnd={(event) => {
                        if (restrictToDevices) return;
                        // FIX: igual que dispositivos, Konva acumula el desplazamiento
                        // relativo en x()/y(). Pasamos el delta y reseteamos el nodo.
                        const dx = snap(event.target.x());
                        const dy = snap(event.target.y());
                        event.target.position({ x: 0, y: 0 });
                        commitWallDrag(wall.id, dx, dy);
                      }}
                      onClick={() => {
                        setSelectedId(wall.id);
                        setSelectedType("wall");
                      }}
                      onTap={() => {
                        setSelectedId(wall.id);
                        setSelectedType("wall");
                      }}
                      hitStrokeWidth={10}
                    />
                  );
                })}
                {ghostWall}
              </Layer>

              <Layer>
                {devices.map((device) => {
                  const isSelected = selectedType === "device" && selectedId === device.id;
                  return (
                    <Group
                      key={device.id}
                      x={device.x}
                      y={device.y}
                      draggable={mode === "select"}
                      onDragEnd={(event) => {
                        // FIX: capturamos el delta antes de resetear,
                        // commitDeviceDrag suma ese delta a la posición original del estado.
                        const deltaX = event.target.x() - device.x;
                        const deltaY = event.target.y() - device.y;
                        event.target.position({ x: device.x, y: device.y });
                        commitDeviceDrag(device.id, deltaX, deltaY);
                      }}
                      onClick={() => {
                        setSelectedId(device.id);
                        setSelectedType("device");
                      }}
                      onTap={() => {
                        setSelectedId(device.id);
                        setSelectedType("device");
                      }}
                    >
                      <Rect
                        x={-16}
                        y={-16}
                        width={32}
                        height={32}
                        cornerRadius={6}
                        fill={isSelected ? "#eff6ff" : "#ffffff"}
                        stroke={isSelected ? "#2563eb" : "#cbd5e1"}
                        strokeWidth={isSelected ? 2 : 1.5}
                      />
                      <Text
                        text={device.label.slice(0, 2).toUpperCase()}
                        fontSize={10}
                        x={-11}
                        y={-5}
                        fill="#334155"
                        listening={false}
                      />
                      <Text
                        text={device.label}
                        y={18}
                        x={-26}
                        width={52}
                        align="center"
                        fontSize={8}
                        fill="#64748b"
                        listening={false}
                      />
                    </Group>
                  );
                })}
              </Layer>
            </Stage>
          </div>
        </div>
      </div>
    </section>
  );
}
