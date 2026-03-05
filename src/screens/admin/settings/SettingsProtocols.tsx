import Button from "../../../components/Button";
import ConfirmModal from "../../../components/ConfirmModal";
import Field from "../../../components/Field";
import Input from "../../../components/Input";
import Modal from "../../../components/Modal";
import useSettingsProtocols from "../../../hooks/useSettingsProtocols";

export default function SettingsProtocols() {
  const {
    loading,
    submitting,
    isModalOpen,
    editingProtocol,
    protocolName,
    searchTerm,
    protocolToDelete,
    filteredProtocols,
    hasChanges,
    companyId,
    canCreate,
    canUpdate,
    canDelete,
    setProtocolName,
    setSearchTerm,
    openCreateModal,
    openEditModal,
    closeModal,
    handleSubmit,
    askDeleteProtocol,
    cancelDeleteProtocol,
    confirmDeleteProtocol,
  } = useSettingsProtocols();

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

      <Input
        value={searchTerm}
        onChange={(event) => setSearchTerm(event.target.value)}
        maxLength={120}
        placeholder="Buscar protocolos..."
      />

      <div className="space-y-3">
        {!loading && filteredProtocols.length === 0 && (
          <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-500 shadow-sm">
            No hay protocolos disponibles para la busqueda.
          </div>
        )}

        {!loading &&
          filteredProtocols.map((protocol) => (
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
                      onClick={() => askDeleteProtocol(protocol)}
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

      <ConfirmModal
        open={Boolean(protocolToDelete)}
        title="Eliminar protocolo"
        message={`Deseas eliminar el protocolo ${protocolToDelete?.name ?? "(sin nombre)"}?`}
        loading={submitting}
        onCancel={cancelDeleteProtocol}
        onConfirm={confirmDeleteProtocol}
      />
    </section>
  );
}
