import { Layers, MousePointer2, Save, ScanLine, Undo2, Redo2, PlusSquare, PackagePlus } from "lucide-react";

export type FloorPlanMode = "select" | "draw-wall" | "draw-zone" | "add-device";

interface Option {
  id: string;
  name: string;
}

interface ToolbarProps {
  mode: FloorPlanMode;
  onModeChange: (mode: FloorPlanMode) => void;
  showGrid: boolean;
  onToggleGrid: () => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  zoneOptions: Option[];
  selectedZoneId: string;
  onSelectZone: (zoneId: string) => void;
  deviceOptions: Option[];
  selectedDeviceId: string;
  onSelectDevice: (deviceId: string) => void;
  onManualSave: () => void;
  manualSaving: boolean;
  autosaveLabel: string;
  showSave?: boolean;
  showWallTools?: boolean;
  showZoneTools?: boolean;
  showZoneSelector?: boolean;
}

function ToolButton({
  active,
  onClick,
  title,
  children,
}: {
  active?: boolean;
  onClick: () => void;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition ${
        active
          ? "border-blue-600 bg-blue-600 text-white"
          : "border-slate-200 bg-white text-slate-700 hover:bg-slate-100"
      }`}
    >
      {children}
    </button>
  );
}

export default function Toolbar({
  mode,
  onModeChange,
  showGrid,
  onToggleGrid,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  zoneOptions,
  selectedZoneId,
  onSelectZone,
  deviceOptions,
  selectedDeviceId,
  onSelectDevice,
  onManualSave,
  manualSaving,
  autosaveLabel,
  showSave = true,
  showWallTools = true,
  showZoneTools = true,
  showZoneSelector = true,
}: ToolbarProps) {
  return (
    <div className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 px-3 py-2 backdrop-blur">
      <div className="flex flex-wrap items-center gap-2">
        <ToolButton
          active={mode === "select"}
          onClick={() => onModeChange("select")}
          title="Seleccionar"
        >
          <MousePointer2 size={14} />
          Seleccionar
        </ToolButton>
        {showWallTools ? (
          <ToolButton
            active={mode === "draw-wall"}
            onClick={() => onModeChange("draw-wall")}
            title="Dibujar pared"
          >
            <ScanLine size={14} />
            Pared
          </ToolButton>
        ) : null}
        {showZoneTools ? (
          <ToolButton
            active={mode === "draw-zone"}
            onClick={() => onModeChange("draw-zone")}
            title="Dibujar zona"
          >
            <PlusSquare size={14} />
            Zona
          </ToolButton>
        ) : null}
        <ToolButton
          active={mode === "add-device"}
          onClick={() => onModeChange("add-device")}
          title="Agregar dispositivo"
        >
          <PackagePlus size={14} />
          Dispositivo
        </ToolButton>

        <span className="mx-1 h-5 w-px bg-slate-200" />

        <button
          type="button"
          onClick={onUndo}
          disabled={!canUndo}
          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Undo2 size={13} />
          Deshacer
        </button>
        <button
          type="button"
          onClick={onRedo}
          disabled={!canRedo}
          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Redo2 size={13} />
          Rehacer
        </button>

        <button
          type="button"
          onClick={onToggleGrid}
          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-700 hover:bg-slate-100"
        >
          <Layers size={13} />
          {showGrid ? "Ocultar grid" : "Mostrar grid"}
        </button>

        <span className="mx-1 h-5 w-px bg-slate-200" />

        {showZoneSelector ? (
          <label className="text-xs font-medium text-slate-500">
            Zona
            <select
              value={selectedZoneId}
              onChange={(event) => onSelectZone(event.target.value)}
              className="ml-2 rounded-md border border-slate-300 px-2 py-1 text-xs text-slate-700 focus:border-blue-500 focus:outline-none"
            >
              <option value="">Seleccionar</option>
              {zoneOptions.map((zone) => (
                <option key={zone.id} value={zone.id}>
                  {zone.name}
                </option>
              ))}
            </select>
          </label>
        ) : null}

        <label className="text-xs font-medium text-slate-500">
          Dispositivo
          <select
            value={selectedDeviceId}
            onChange={(event) => onSelectDevice(event.target.value)}
            className="ml-2 rounded-md border border-slate-300 px-2 py-1 text-xs text-slate-700 focus:border-blue-500 focus:outline-none"
          >
            <option value="">Seleccionar</option>
            {deviceOptions.map((device) => (
              <option key={device.id} value={device.id}>
                {device.name}
              </option>
            ))}
          </select>
        </label>

        {showSave ? (
          <>
            <button
              type="button"
              onClick={onManualSave}
              disabled={manualSaving}
              className="ml-auto inline-flex items-center gap-1 rounded-lg border border-emerald-600 bg-emerald-600 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Save size={13} />
              {manualSaving ? "Guardando..." : "Guardar plano"}
            </button>

            <span className="text-xs text-slate-500">{autosaveLabel}</span>
          </>
        ) : null}
      </div>
    </div>
  );
}
