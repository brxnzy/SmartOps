import { useCallback, useEffect, useMemo, useState } from "react";
import Button from "../../../components/Button";
import Field from "../../../components/Field";
import Input from "../../../components/Input";
import Modal from "../../../components/Modal";
import { PERMISSIONS } from "../../../constants/permissions";
import useAuth from "../../../hooks/useAuth";
import { createBrand, deleteBrand, getBrandsByCompany, updateBrand } from "../../../services/device.service";
import { notifications } from "../../../services/notification.service";
import type { Brand } from "../../../types/Device";

export default function SettingsBrands() {
  const { companyProfile, canAccess } = useAuth();
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBrand, setEditingBrand] = useState<Brand | null>(null);
  const [brandName, setBrandName] = useState("");

  const companyId = companyProfile?.id ?? null;
  const canCreate = canAccess(PERMISSIONS.settingsBrandsCreate);
  const canUpdate = canAccess(PERMISSIONS.settingsBrandsUpdate);
  const canDelete = canAccess(PERMISSIONS.settingsBrandsDelete);

  const loadBrands = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getBrandsByCompany(companyId);
      setBrands(data);
    } catch (error) {
      notifications.error({
        title: "Error cargando marcas",
        description: "No se pudieron obtener las marcas.",
      });
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  useEffect(() => {
    loadBrands();
  }, [loadBrands]);

  const hasChanges = useMemo(() => {
    if (!editingBrand) return Boolean(brandName.trim());
    return brandName.trim() !== editingBrand.name.trim();
  }, [brandName, editingBrand]);

  const openCreateModal = () => {
    setEditingBrand(null);
    setBrandName("");
    setIsModalOpen(true);
  };

  const openEditModal = (brand: Brand) => {
    setEditingBrand(brand);
    setBrandName(brand.name);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    if (submitting) return;
    setIsModalOpen(false);
    setEditingBrand(null);
    setBrandName("");
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const cleanName = brandName.trim();

    if (!cleanName) return;
    if (!companyId && !editingBrand) {
      notifications.warning({
        title: "Compania requerida",
        description: "No se puede crear una marca sin compania asignada.",
      });
      return;
    }

    setSubmitting(true);
    try {
      if (editingBrand) {
        const updated = await updateBrand({
          id: editingBrand.id,
          name: cleanName,
        });

        setBrands((current) =>
          current.map((item) => (item.id === updated.id ? updated : item))
        );

        notifications.success({
          title: "Marca actualizada",
          description: "Los cambios fueron guardados correctamente.",
        });
      } else {
        const created = await createBrand({
          name: cleanName,
          companyId: companyId as string,
        });

        setBrands((current) =>
          [...current, created].sort((a, b) => a.name.localeCompare(b.name))
        );

        notifications.success({
          title: "Marca creada",
          description: "La marca fue creada correctamente.",
        });
      }

      closeModal();
    } catch (error) {
      notifications.error({
        title: editingBrand ? "Error actualizando marca" : "Error creando marca",
        description: "No se pudieron guardar los cambios.",
      });
      console.error(error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (brand: Brand) => {
    const accepted = window.confirm(`Eliminar la marca ${brand.name}?`);
    if (!accepted) return;

    setSubmitting(true);
    try {
      await deleteBrand(brand.id);
      setBrands((current) => current.filter((item) => item.id !== brand.id));
      notifications.success({
        title: "Marca eliminada",
        description: "La marca fue eliminada.",
      });
    } catch (error) {
      notifications.error({
        title: "Error eliminando marca",
        description: "No se pudo eliminar la marca.",
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
          <h1 className="text-3xl font-bold text-slate-800">Marcas</h1>
          <p className="text-sm text-slate-500">Administra el catalogo de marcas por compania.</p>
        </div>

        {canCreate && (
          <Button
            type="button"
            onClick={openCreateModal}
            disabled={!companyId || submitting}
            className="bg-blue-600 text-white hover:bg-blue-500"
          >
            Nueva marca
          </Button>
        )}
      </header>

      <div className="space-y-3">
        {!loading && brands.length === 0 && (
          <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-500 shadow-sm">
            No hay marcas disponibles.
          </div>
        )}

        {!loading &&
          brands.map((brand) => (
            <article
              key={brand.id}
              className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="space-y-1">
                  <h2 className="text-base font-semibold text-slate-800">{brand.name}</h2>
                </div>

                <div className="flex items-center gap-2">
                  {canUpdate && (
                    <Button
                      type="button"
                      onClick={() => openEditModal(brand)}
                      disabled={submitting}
                      className="border-amber-300 text-amber-700 hover:bg-amber-50"
                    >
                      Editar
                    </Button>
                  )}

                  {canDelete && (
                    <Button
                      type="button"
                      onClick={() => handleDelete(brand)}
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
        title={editingBrand ? "Editar marca" : "Crear marca"}
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
              form="brand-form"
              disabled={submitting || !brandName.trim() || !hasChanges}
              className="border-blue-300 text-blue-700 hover:bg-blue-50"
            >
              {editingBrand ? "Guardar cambios" : "Crear marca"}
            </Button>
          </>
        }
      >
        <form id="brand-form" onSubmit={handleSubmit} className="space-y-3">
          <Field label="Nombre">
            <Input
              value={brandName}
              onChange={(event) => setBrandName(event.target.value)}
              maxLength={120}
              placeholder="Ejemplo: Siemens"
            />
          </Field>
        </form>
      </Modal>
    </section>
  );
}
