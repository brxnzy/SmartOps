import { useCallback, useEffect, useMemo, useState } from "react";
import Button from "../../../components/Button";
import Field from "../../../components/Field";
import Input from "../../../components/Input";
import Modal from "../../../components/Modal";
import { PERMISSIONS } from "../../../constants/permissions";
import useAuth from "../../../hooks/useAuth";
import {
  createDeviceType,
  deleteDeviceType,
  getDeviceTypesByCompany,
  updateDeviceType,
} from "../../../services/device.service";
import { notifications } from "../../../services/notification.service";
import type { DeviceType } from "../../../types/Device";

export default function SettingsDeviceTypes() {
  const { companyProfile, canAccess } = useAuth();
  const [deviceTypes, setDeviceTypes] = useState<DeviceType[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDeviceType, setEditingDeviceType] = useState<DeviceType | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const companyId = companyProfile?.id ?? null;
  const canCreate = canAccess(PERMISSIONS.settingsDeviceTypesCreate);
  const canUpdate = canAccess(PERMISSIONS.settingsDeviceTypesUpdate);
  const canDelete = canAccess(PERMISSIONS.settingsDeviceTypesDelete);

  const loadDeviceTypes = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getDeviceTypesByCompany(companyId);
      setDeviceTypes(data);
    } catch (error) {
      notifications.error({
        title: "Error cargando tipos de dispositivos",
        description: "No se pudieron obtener los tipos de dispositivos.",
      });
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  useEffect(() => {
    loadDeviceTypes();
  }, [loadDeviceTypes]);

  const hasChanges = useMemo(() => {
    const cleanName = name.trim();
    const cleanDescription = description.trim();

    if (!editingDeviceType) return Boolean(cleanName);

    return (
      cleanName !== editingDeviceType.name.trim() ||
      cleanDescription !== (editingDeviceType.description ?? "").trim()
    );
  }, [description, editingDeviceType, name]);

  const openCreateModal = () => {
    setEditingDeviceType(null);
    setName("");
    setDescription("");
    setIsModalOpen(true);
  };

  const openEditModal = (deviceType: DeviceType) => {
    setEditingDeviceType(deviceType);
    setName(deviceType.name);
    setDescription(deviceType.description ?? "");
    setIsModalOpen(true);
  };

  const closeModal = () => {
    if (submitting) return;
    setIsModalOpen(false);
    setEditingDeviceType(null);
    setName("");
    setDescription("");
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const cleanName = name.trim();
    const cleanDescription = description.trim();

    if (!cleanName) return;
    if (!companyId && !editingDeviceType) {
      notifications.warning({
        title: "Compania requerida",
        description: "No se puede crear un tipo de dispositivo sin compania asignada.",
      });
      return;
    }

    setSubmitting(true);
    try {
      if (editingDeviceType) {
        const updated = await updateDeviceType({
          id: editingDeviceType.id,
          name: cleanName,
          description: cleanDescription || null,
        });

        setDeviceTypes((current) =>
          current.map((item) => (item.id === updated.id ? updated : item))
        );

        notifications.success({
          title: "Tipo de dispositivo actualizado",
          description: "Los cambios fueron guardados correctamente.",
        });
      } else {
        const created = await createDeviceType({
          name: cleanName,
          description: cleanDescription || null,
          companyId: companyId as string,
        });

        setDeviceTypes((current) =>
          [...current, created].sort((a, b) => a.name.localeCompare(b.name))
        );

        notifications.success({
          title: "Tipo de dispositivo creado",
          description: "El tipo de dispositivo fue creado correctamente.",
        });
      }

      closeModal();
    } catch (error) {
      notifications.error({
        title: editingDeviceType
          ? "Error actualizando tipo de dispositivo"
          : "Error creando tipo de dispositivo",
        description: "No se pudieron guardar los cambios.",
      });
      console.error(error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (deviceType: DeviceType) => {
    const accepted = window.confirm(`Eliminar el tipo de dispositivo ${deviceType.name}?`);
    if (!accepted) return;

    setSubmitting(true);
    try {
      await deleteDeviceType(deviceType.id);
      setDeviceTypes((current) => current.filter((item) => item.id !== deviceType.id));
      notifications.success({
        title: "Tipo de dispositivo eliminado",
        description: "El tipo de dispositivo fue eliminado.",
      });
    } catch (error) {
      notifications.error({
        title: "Error eliminando tipo de dispositivo",
        description: "No se pudo eliminar el tipo de dispositivo.",
      });
      console.error(error);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="space-y-6">
      <header className="px-1 flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold text-slate-800">Tipos de dispositivos</h1>
          <p className="text-sm text-slate-500">Administra el catalogo de tipos de dispositivos por compania.</p>
        </div>

        {canCreate && (
          <Button
            type="button"
            onClick={openCreateModal}
            disabled={!companyId || submitting}
            className="bg-blue-600 text-white hover:bg-blue-500"
          >
            Nuevo tipo
          </Button>
        )}
      </header>

      <div className="space-y-3">
        {!loading && deviceTypes.length === 0 && (
          <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-500 shadow-sm">
            No hay tipos de dispositivos disponibles.
          </div>
        )}

        {!loading &&
          deviceTypes.map((deviceType) => (
            <article
              key={deviceType.id}
              className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <h2 className="text-base font-semibold text-slate-800">{deviceType.name}</h2>
                  {deviceType.description && (
                    <p className="text-sm text-slate-600">{deviceType.description}</p>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {canUpdate && (
                    <Button
                      type="button"
                      onClick={() => openEditModal(deviceType)}
                      disabled={submitting}
                      className="border-amber-300 text-amber-700 hover:bg-amber-50"
                    >
                      Editar
                    </Button>
                  )}

                  {canDelete && (
                    <Button
                      type="button"
                      onClick={() => handleDelete(deviceType)}
                      disabled={submitting}
                      className="border-red-300 text-red-700 hover:bg-red-50"
                    >
                      Eliminar
                    </Button>
                  )}
                </div>
              </div>
            </article>
          ))}
      </div>

      <Modal
        open={isModalOpen}
        onClose={closeModal}
        title={editingDeviceType ? "Editar tipo de dispositivo" : "Crear tipo de dispositivo"}
        footer={
          <>
            <Button
              type="button"
              onClick={closeModal}
              disabled={submitting}
              className="border-slate-300 text-slate-700 hover:bg-slate-100"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              form="device-type-form"
              disabled={submitting || !name.trim() || !hasChanges}
              className="border-blue-300 text-blue-700 hover:bg-blue-50"
            >
              {editingDeviceType ? "Guardar cambios" : "Crear tipo"}
            </Button>
          </>
        }
      >
        <form id="device-type-form" onSubmit={handleSubmit} className="space-y-3">
          <Field label="Nombre">
            <Input
              value={name}
              onChange={(event) => setName(event.target.value)}
              maxLength={120}
              placeholder="Ejemplo: Sensor de temperatura"
            />
          </Field>

          <Field label="Descripcion (opcional)">
            <Input
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              maxLength={255}
              placeholder="Breve descripcion del tipo de dispositivo"
            />
          </Field>
        </form>
      </Modal>
    </section>
  );
}
