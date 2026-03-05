import { useCallback, useEffect, useMemo, useState } from "react";
import Button from "../../../components/Button";
import Field from "../../../components/Field";
import Input from "../../../components/Input";
import Modal from "../../../components/Modal";
import { PERMISSIONS } from "../../../constants/permissions";
import useAuth from "../../../hooks/useAuth";
import { notifications } from "../../../services/notification.service";
import {
  createProtocol,
  deleteProtocol,
  getProtocolsByCompany,
  updateProtocol,
} from "../../../services/device.service";
import type { Protocol } from "../../../types/Device";

export default function SettingsProtocols() {
  const { companyProfile, canAccess } = useAuth();
  const [protocols, setProtocols] = useState<Protocol[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProtocol, setEditingProtocol] = useState<Protocol | null>(null);
  const [protocolName, setProtocolName] = useState("");

  const companyId = companyProfile?.id ?? null;
  const canCreate = canAccess(PERMISSIONS.settingsProtocolsCreate);
  const canUpdate = canAccess(PERMISSIONS.settingsProtocolsUpdate);
  const canDelete = canAccess(PERMISSIONS.settingsProtocolsDelete);

  const loadProtocols = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getProtocolsByCompany(companyId);
      setProtocols(data);
    } catch (error) {
      notifications.error({
        title: "Error cargando protocolos",
        description: "No se pudieron obtener los protocolos.",
      });
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  useEffect(() => {
    loadProtocols();
  }, [loadProtocols]);

  const hasChanges = useMemo(() => {
    if (!editingProtocol) return Boolean(protocolName.trim());
    return protocolName.trim() !== (editingProtocol.name ?? "").trim();
  }, [editingProtocol, protocolName]);

  const openCreateModal = () => {
    setEditingProtocol(null);
    setProtocolName("");
    setIsModalOpen(true);
  };

  const openEditModal = (protocol: Protocol) => {
    setEditingProtocol(protocol);
    setProtocolName(protocol.name ?? "");
    setIsModalOpen(true);
  };

  const closeModal = () => {
    if (submitting) return;
    setIsModalOpen(false);
    setEditingProtocol(null);
    setProtocolName("");
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const cleanName = protocolName.trim();

    if (!cleanName) return;
    if (!companyId && !editingProtocol) {
      notifications.warning({
        title: "Compania requerida",
        description: "No se puede crear un protocolo sin compania asignada.",
      });
      return;
    }

    setSubmitting(true);
    try {
      if (editingProtocol) {
        const updated = await updateProtocol({
          id: editingProtocol.id,
          name: cleanName,
        });

        setProtocols((current) =>
          current
            .map((item) => (item.id === updated.id ? updated : item))
            .sort((a, b) => (a.name ?? "").localeCompare(b.name ?? ""))
        );

        notifications.success({
          title: "Protocolo actualizado",
          description: "Los cambios fueron guardados correctamente.",
        });
      } else {
        const created = await createProtocol({
          name: cleanName,
          companyId: companyId as string,
        });

        setProtocols((current) =>
          [...current, created].sort((a, b) => (a.name ?? "").localeCompare(b.name ?? ""))
        );

        notifications.success({
          title: "Protocolo creado",
          description: "El protocolo fue creado correctamente.",
        });
      }

      closeModal();
    } catch (error) {
      notifications.error({
        title: editingProtocol ? "Error actualizando protocolo" : "Error creando protocolo",
        description: "No se pudieron guardar los cambios.",
      });
      console.error(error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (protocol: Protocol) => {
    const accepted = window.confirm(`Eliminar el protocolo ${protocol.name ?? "(sin nombre)"}?`);
    if (!accepted) return;

    setSubmitting(true);
    try {
      await deleteProtocol(protocol.id);
      setProtocols((current) => current.filter((item) => item.id !== protocol.id));
      notifications.success({
        title: "Protocolo eliminado",
        description: "El protocolo fue eliminado.",
      });
    } catch (error) {
      notifications.error({
        title: "Error eliminando protocolo",
        description: "No se pudo eliminar el protocolo.",
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
          <h1 className="text-3xl font-bold text-slate-800">Protocolos</h1>
          <p className="text-sm text-slate-500">Administra el catalogo de protocolos por compania.</p>
        </div>

        {canCreate && (
          <Button
            type="button"
            onClick={openCreateModal}
            disabled={!companyId || submitting}
            className="bg-blue-600 text-white hover:bg-blue-500"
          >
            Nuevo protocolo
          </Button>
        )}
      </header>

      <div className="space-y-3">
        {!loading && protocols.length === 0 && (
          <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-500 shadow-sm">
            No hay protocolos disponibles.
          </div>
        )}

        {!loading &&
          protocols.map((protocol) => (
            <article
              key={protocol.id}
              className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="space-y-1">
                  <h2 className="text-base font-semibold text-slate-800">
                    {protocol.name?.trim() || "(Sin nombre)"}
                  </h2>
                </div>

                <div className="flex items-center gap-2">
                  {canUpdate && (
                    <Button
                      type="button"
                      onClick={() => openEditModal(protocol)}
                      disabled={submitting}
                      className="border-amber-300 text-amber-700 hover:bg-amber-50"
                    >
                      Editar
                    </Button>
                  )}

                  {canDelete && (
                    <Button
                      type="button"
                      onClick={() => handleDelete(protocol)}
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
        title={editingProtocol ? "Editar protocolo" : "Crear protocolo"}
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
              form="protocol-form"
              disabled={submitting || !protocolName.trim() || !hasChanges}
              className="border-blue-300 text-blue-700 hover:bg-blue-50"
            >
              {editingProtocol ? "Guardar cambios" : "Crear protocolo"}
            </Button>
          </>
        }
      >
        <form id="protocol-form" onSubmit={handleSubmit} className="space-y-3">
          <Field label="Nombre">
            <Input
              value={protocolName}
              onChange={(event) => setProtocolName(event.target.value)}
              maxLength={120}
              placeholder="Ejemplo: Modbus TCP"
            />
          </Field>
        </form>
      </Modal>
    </section>
  );
}
