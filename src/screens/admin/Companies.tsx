import { ImageOff } from "lucide-react";
import Button from "../../components/Button";
import ConfirmModal from "../../components/ConfirmModal";
import Field from "../../components/Field";
import FileInput from "../../components/FileInput";
import Input from "../../components/Input";
import Modal from "../../components/Modal";
import useCompanies from "../../hooks/useCompanies";
import { formatPhoneDigits } from "../../utils/formatters";

export default function Companies() {
  const {
    loading,
    submitting,
    isModalOpen,
    editingCompany,
    companyToDelete,
    name,
    address,
    phone,
    rnc,
    searchTerm,
    filterField,
    selectedFile,
    removeLogo,
    fileInputKey,
    filteredCompanies,
    hasChanges,
    canCreate,
    canUpdate,
    canDelete,
    setName,
    setAddress,
    setPhone,
    setRnc,
    setSearchTerm,
    setFilterField,
    openCreateModal,
    openEditModal,
    closeModal,
    handleSubmit,
    handleFileChange,
    handleRemoveLogo,
    askDeleteCompany,
    cancelDeleteCompany,
    confirmDeleteCompany,
  } = useCompanies();

  return (
    <section className="space-y-6">
      <header className="relative overflow-hidden rounded-3xl border border-slate-200 bg-linear-to-br from-slate-900 via-slate-800 to-slate-700 p-6 text-white shadow-sm">
        <div className="absolute -right-24 -top-24 h-48 w-48 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute -bottom-24 -left-16 h-56 w-56 rounded-full bg-cyan-400/10 blur-3xl" />
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-200/80">
              Configuracion
            </p>
            <h1 className="text-3xl font-semibold">Companias</h1>
            <p className="text-sm text-slate-200/90">
              Administra identidad visual, datos fiscales y contacto.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {canCreate && (
              <Button
                type="button"
                onClick={openCreateModal}
                disabled={submitting}
                className="border-white/30 bg-white/10 text-white hover:bg-white/20"
              >
                Nueva compania
              </Button>
            )}
          </div>
        </div>
      </header>

      <div className="flex gap-3 w-full">
  <div className="flex w-full flex-col gap-2 md:flex-row md:items-center">
    
    <div className="grow">
      <Input
        value={searchTerm}
        onChange={(event) => setSearchTerm(event.target.value)}
        maxLength={160}
        placeholder="Buscar por nombre, direccion, telefono o RNC..."
        className="py-4 w-full text-base"
      />
    </div>

    <div className="w-full md:w-56 shrink-0">
      <Field label="Filtrar por">
        <select
          value={filterField}
          onChange={(event) =>
            setFilterField(event.target.value as "all" | "name" | "address" | "phone" | "rnc")
          }
          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
        >
          <option value="all">Todos</option>
          <option value="name">Nombre</option>
          <option value="address">Direccion</option>
          <option value="phone">Telefono</option>
          <option value="rnc">RNC</option>
        </select>
      </Field>
    </div>

  </div>
</div>

      <div className="space-y-3">
        {!loading && filteredCompanies.length === 0 && (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-6 text-sm text-slate-500 shadow-sm">
            No hay companias disponibles para la busqueda.
          </div>
        )}

        {!loading &&
          filteredCompanies.map((company) => (
            <article
              key={company.id}
              className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
            >
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                  <div className="relative">
                    <div className="absolute -inset-2 rounded-2xl bg-linear-to-br from-cyan-400/20 via-blue-500/10 to-transparent" />
                    {company.logoUrl ? (
                      <img
                        src={company.logoUrl}
                        alt={`Logo ${company.name}`}
                        className="relative h-16 w-16 rounded-2xl border border-slate-200 bg-white object-cover"
                      />
                    ) : (
                      <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl border border-dashed border-slate-200 text-xs font-semibold text-slate-400">
                        Sin logo
                      </div>
                    )}
                  </div>

                  <div className="space-y-1">
                    <h2 className="text-lg font-semibold text-slate-900">{company.name}</h2>
                    <div className="flex flex-wrap gap-2 text-xs text-slate-500">
                      <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1">
                        Direccion: {company.address ?? "No definida"}
                      </span>
                      <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1">
                        Telefono: {company.phone ?? "No definido"}
                      </span>
                      <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1">
                        RNC: {company.rnc ?? "No definido"}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {canUpdate && (
                    <Button
                      type="button"
                      onClick={() => openEditModal(company)}
                      disabled={submitting}
                      className="border-amber-300 text-amber-700 hover:bg-amber-50"
                    >
                      Editar
                    </Button>
                  )}

                  {canDelete && (
                    <Button
                      type="button"
                      onClick={() => askDeleteCompany(company)}
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
        title={editingCompany ? "Editar compania" : "Crear compania"}
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
              form="company-form"
              disabled={submitting || !name.trim() || !hasChanges}
              className="border-blue-300 text-blue-700 hover:bg-blue-50"
            >
              {editingCompany ? "Guardar cambios" : "Crear compania"}
            </Button>
          </>
        }
      >
        <form id="company-form" onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-3 lg:grid-cols-2">
            <Field label="Nombre">
              <Input
                value={name}
                onChange={(event) => setName(event.target.value)}
                maxLength={140}
                placeholder="Ejemplo: SmartOps RD"
              />
            </Field>

            <Field label="Telefono">
              <Input
                value={phone}
                onChange={(event) => setPhone(formatPhoneDigits(event.target.value))}
                maxLength={20}
                placeholder="Ejemplo: 809-555-0101"
              />
            </Field>

            <Field label="Direccion">
              <Input
                value={address}
                onChange={(event) => setAddress(event.target.value)}
                maxLength={180}
                placeholder="Ejemplo: Av. Principal #123"
              />
            </Field>

            <Field label="RNC">
              <Input
                value={rnc}
                onChange={(event) => setRnc(event.target.value)}
                maxLength={20}
                placeholder="Ejemplo: 101234567"
              />
            </Field>
          </div>

          <FileInput
            key={fileInputKey}
            id="company-logo"
            label="Logo de la compania"
            accept="image/*"
            onChange={handleFileChange}
            disabled={submitting}
          />

          {editingCompany?.logoUrl && !selectedFile && !removeLogo ? (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
              <div className="flex items-center gap-3">
                <img
                  src={editingCompany.logoUrl}
                  alt="Logo actual"
                  className="h-12 w-12 rounded-lg border border-slate-200 bg-white object-cover"
                />
                <p>Logo actual guardado. Puedes reemplazarlo o eliminarlo.</p>
              </div>
              <Button
                type="button"
                onClick={handleRemoveLogo}
                disabled={submitting}
                className="border-red-300 text-red-700 hover:bg-red-50"
                icon={<ImageOff size={16} />}
              >
                Quitar logo
              </Button>
            </div>
          ) : null}

          {removeLogo ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700">
              El logo actual se eliminara al guardar.
            </div>
          ) : null}
        </form>
      </Modal>

      <ConfirmModal
        open={Boolean(companyToDelete)}
        title="Eliminar compania"
        message={`Deseas eliminar la compania ${companyToDelete?.name ?? "(sin nombre)"}?`}
        loading={submitting}
        onCancel={cancelDeleteCompany}
        onConfirm={confirmDeleteCompany}
      />
    </section>
  );
}
