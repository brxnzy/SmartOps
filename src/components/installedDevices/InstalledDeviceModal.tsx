import { useEffect, useMemo, useState } from "react";
import Modal from "../Modal";
import Field from "../Field";
import Button from "../Button";
import type { InstalledDeviceListItem, InstalledDeviceStatus, UpdateInstalledDeviceInput } from "../../types/installedDevice.types";

type CatalogDeviceOption = {
  id: string;
  label: string;
};

type ZoneOption = {
  id: string;
  name: string;
};

type TechnicianOption = {
  id: string;
  name: string;
};

type InstalledDeviceDraft = {
  catalogDeviceId: string;
  zoneId: string;
  serial: string;
  mac: string;
  firmware: string;
  locationDetail: string;
  installedAtLocal: string;
  installedBy: string;
  status: InstalledDeviceStatus;
};

function toDateTimeLocalValue(value: string | null): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function toIsoFromLocal(value: string): string {
  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) throw new Error("Fecha inválida.");
  return new Date(parsed).toISOString();
}

function emptyDraft(defaultInstalledBy: string | null) {
  return {
    catalogDeviceId: "",
    zoneId: "",
    serial: "",
    mac: "",
    firmware: "",
    locationDetail: "",
    installedAtLocal: toDateTimeLocalValue(new Date().toISOString()),
    installedBy: defaultInstalledBy ?? "",
    status: "active" as InstalledDeviceStatus,
  } satisfies InstalledDeviceDraft;
}

export default function InstalledDeviceModal(props: {
  open: boolean;
  mode: "create" | "edit";
  busy: boolean;
  siteId: string;
  zones: ZoneOption[];
  catalogDevices: CatalogDeviceOption[];
  technicians: TechnicianOption[];
  defaultInstalledBy: string | null;
  device?: InstalledDeviceListItem | null;
  onClose: () => void;
  onCreate: (input: {
    siteId: string;
    zoneId: string;
    catalogDeviceId: string;
    serial: string | null;
    mac: string | null;
    firmware: string | null;
    locationDetail: string | null;
    installedAt: string | null;
    installedBy: string | null;
    status: InstalledDeviceStatus;
  }) => Promise<boolean>;
  onUpdate: (deviceId: string, patch: Partial<UpdateInstalledDeviceInput>) => Promise<boolean>;
}) {
  const {
    open,
    mode,
    busy,
    siteId,
    zones,
    catalogDevices,
    technicians,
    defaultInstalledBy,
    device,
    onClose,
    onCreate,
    onUpdate,
  } = props;

  const initialDraft = useMemo(() => emptyDraft(defaultInstalledBy), [defaultInstalledBy]);
  const [draft, setDraft] = useState<InstalledDeviceDraft>(initialDraft);

  useEffect(() => {
    if (!open) return;

    if (mode === "edit" && device) {
      setDraft({
        catalogDeviceId: device.catalogDeviceId,
        zoneId: device.zoneId,
        serial: device.serial ?? "",
        mac: device.mac ?? "",
        firmware: device.firmware ?? "",
        locationDetail: device.locationDetail ?? "",
        installedAtLocal: toDateTimeLocalValue(device.installedAt),
        installedBy: device.installedBy ?? defaultInstalledBy ?? "",
        status: device.status,
      });
      return;
    }

    setDraft(emptyDraft(defaultInstalledBy));
  }, [defaultInstalledBy, device, mode, open]);

  const canSubmit = Boolean(siteId && draft.catalogDeviceId.trim() && draft.zoneId.trim());

  const handleSubmit = async () => {
    if (!canSubmit || busy) return;

    const installedAt = draft.installedAtLocal.trim() ? toIsoFromLocal(draft.installedAtLocal) : null;
    const serial = draft.serial.trim() ? draft.serial.trim() : null;
    const mac = draft.mac.trim() ? draft.mac.trim() : null;
    const firmware = draft.firmware.trim() ? draft.firmware.trim() : null;
    const locationDetail = draft.locationDetail.trim() ? draft.locationDetail.trim() : null;
    const installedBy = draft.installedBy.trim() ? draft.installedBy.trim() : null;

    if (mode === "edit" && device) {
      const ok = await onUpdate(device.id, {
        catalogDeviceId: draft.catalogDeviceId.trim(),
        zoneId: draft.zoneId.trim(),
        serial,
        mac,
        firmware,
        locationDetail,
        installedAt,
        installedBy,
        status: draft.status,
      });
      if (ok) onClose();
      return;
    }

    const ok = await onCreate({
      siteId,
      zoneId: draft.zoneId.trim(),
      catalogDeviceId: draft.catalogDeviceId.trim(),
      serial,
      mac,
      firmware,
      locationDetail,
      installedAt,
      installedBy,
      status: draft.status,
    });
    if (ok) onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title={mode === "edit" ? "Editar dispositivo instalado" : "Registrar dispositivo instalado"}
      subtitle="Registro real de ejecución. Se usa para acta, garantías y soporte."
      footer={
        <>
          <Button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="border-slate-300 bg-white text-slate-700 hover:bg-slate-100"
          >
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={!canSubmit || busy}
            className="border-blue-600 bg-blue-600 text-white hover:bg-blue-700"
          >
            {mode === "edit" ? "Guardar cambios" : busy ? "Registrando..." : "Registrar"}
          </Button>
        </>
      }
    >
      <div className="grid gap-3 lg:grid-cols-2">
        <Field label="Dispositivo (catálogo)">
          <select
            value={draft.catalogDeviceId}
            onChange={(event) => setDraft((current) => ({ ...current, catalogDeviceId: event.target.value }))}
            disabled={busy}
            className="w-full rounded-xl border-2 border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 focus:border-blue-500 focus:outline-none"
          >
            <option value="">Selecciona un dispositivo...</option>
            {catalogDevices.map((deviceOption) => (
              <option key={deviceOption.id} value={deviceOption.id}>
                {deviceOption.label}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Zona">
          <select
            value={draft.zoneId}
            onChange={(event) => setDraft((current) => ({ ...current, zoneId: event.target.value }))}
            disabled={busy}
            className="w-full rounded-xl border-2 border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 focus:border-blue-500 focus:outline-none"
          >
            <option value="">Selecciona una zona...</option>
            {zones.map((zone) => (
              <option key={zone.id} value={zone.id}>
                {zone.name}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Técnico instalador">
          <select
            value={draft.installedBy}
            onChange={(event) => setDraft((current) => ({ ...current, installedBy: event.target.value }))}
            disabled={busy}
            className="w-full rounded-xl border-2 border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 focus:border-blue-500 focus:outline-none"
          >
            <option value="">No definido</option>
            {technicians.map((tech) => (
              <option key={tech.id} value={tech.id}>
                {tech.name}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Fecha de instalación">
          <input
            type="datetime-local"
            value={draft.installedAtLocal}
            onChange={(event) => setDraft((current) => ({ ...current, installedAtLocal: event.target.value }))}
            disabled={busy}
            className="w-full rounded-xl border-2 border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 focus:border-blue-500 focus:outline-none"
          />
        </Field>

        <Field label="Serial">
          <input
            value={draft.serial}
            onChange={(event) => setDraft((current) => ({ ...current, serial: event.target.value }))}
            disabled={busy}
            placeholder="Opcional (único en el proyecto)"
            className="w-full rounded-xl border-2 border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 focus:border-blue-500 focus:outline-none"
          />
        </Field>

        <Field label="MAC">
          <input
            value={draft.mac}
            onChange={(event) => setDraft((current) => ({ ...current, mac: event.target.value }))}
            disabled={busy}
            placeholder="Opcional (único en el proyecto)"
            className="w-full rounded-xl border-2 border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 focus:border-blue-500 focus:outline-none"
          />
        </Field>

        <Field label="Firmware">
          <input
            value={draft.firmware}
            onChange={(event) => setDraft((current) => ({ ...current, firmware: event.target.value }))}
            disabled={busy}
            placeholder="Opcional"
            className="w-full rounded-xl border-2 border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 focus:border-blue-500 focus:outline-none"
          />
        </Field>

        <Field label="Ubicación exacta">
          <input
            value={draft.locationDetail}
            onChange={(event) => setDraft((current) => ({ ...current, locationDetail: event.target.value }))}
            disabled={busy}
            placeholder='Ej: "pared norte", "techo sala"'
            className="w-full rounded-xl border-2 border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 focus:border-blue-500 focus:outline-none"
          />
        </Field>

        <Field label="Estado">
          <select
            value={draft.status}
            onChange={(event) => setDraft((current) => ({ ...current, status: event.target.value as InstalledDeviceStatus }))}
            disabled={busy}
            className="w-full rounded-xl border-2 border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 focus:border-blue-500 focus:outline-none"
          >
            <option value="active">Activo</option>
            <option value="maintenance">En mantenimiento</option>
            <option value="retired">Retirado</option>
          </select>
        </Field>
      </div>
    </Modal>
  );
}
