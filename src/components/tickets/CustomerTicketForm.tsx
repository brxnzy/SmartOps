import { useEffect, useMemo, useState } from "react";
import Button from "../Button";
import Field from "../Field";
import { useAuth } from "../../hooks/useAuth";
import { notifications } from "../../services/notification.service";
import { createTicket } from "../../services/tickets.service";
import { listTicketCategories } from "../../services/ticketCategories.service";
import type { TicketCategoryItem, TicketSla, TicketListItem } from "../../types/ticketing.types";
import { supabase } from "../../libs/supabase";

type SiteOption = { id: string; name: string };
type ZoneOption = { id: string; name: string; customer_site_id: string };

const SLA_OPTIONS: Array<{ value: TicketSla; label: string }> = [
  { value: "urgente", label: "Urgente" },
  { value: "24h", label: "24h" },
  { value: "48h", label: "48h" },
];

interface CustomerTicketFormProps {
  onSuccess?: (ticket: TicketListItem) => void;
  onCancel?: () => void;
  submitLabel?: string;
  showCancel?: boolean;
}

export default function CustomerTicketForm({
  onSuccess,
  onCancel,
  submitLabel = "Enviar ticket",
  showCancel = true,
}: CustomerTicketFormProps) {
  const { companyProfile, authUser } = useAuth();
  const companyId = companyProfile?.id ?? null;
  const customerId = authUser?.id ?? null;
  const [sites, setSites] = useState<SiteOption[]>([]);
  const [zones, setZones] = useState<ZoneOption[]>([]);
  const [categories, setCategories] = useState<TicketCategoryItem[]>([]);
  const [selectedSite, setSelectedSite] = useState<string>("");
  const [selectedZone, setSelectedZone] = useState<string>("");
  const [categoryId, setCategoryId] = useState<string>("");
  const [slaType, setSlaType] = useState<TicketSla>("24h");
  const [description, setDescription] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const selectedCategory = categories.find((item) => item.id === categoryId) ?? null;

  useEffect(() => {
    if (!companyId || !customerId) return;
    let active = true;

    supabase
      .from("customer_sites")
      .select("id, name")
      .eq("company_id", companyId)
      .eq("customer_id", customerId)
      .order("name", { ascending: true })
      .then(({ data, error }) => {
        if (!active) return;
        if (error) {
          notifications.error({ title: "Error", description: error.message });
          return;
        }
        setSites((data ?? []) as SiteOption[]);
      });

    return () => {
      active = false;
    };
  }, [companyId, customerId]);

  useEffect(() => {
    if (!companyId || !selectedSite) {
      setZones([]);
      setSelectedZone("");
      return;
    }

    supabase
      .from("customer_site_zones")
      .select("id, name, customer_site_id")
      .eq("company_id", companyId)
      .eq("customer_site_id", selectedSite)
      .order("name", { ascending: true })
      .then(({ data, error }) => {
        if (error) {
          notifications.error({ title: "Error", description: error.message });
          return;
        }
        setZones((data ?? []) as ZoneOption[]);
      });
  }, [companyId, selectedSite]);

  useEffect(() => {
    if (!companyId) {
      setCategories([]);
      setCategoryId("");
      return;
    }

    let active = true;
    listTicketCategories(companyId)
      .then((data) => {
        if (!active) return;
        setCategories(data);
        if (!categoryId && data.length > 0) {
          setCategoryId(data[0].id);
        }
      })
      .catch((error) => {
        if (!active) return;
        notifications.error({
          title: "Error cargando categorias",
          description: error instanceof Error ? error.message : "No se pudieron cargar las categorias.",
        });
      });

    return () => {
      active = false;
    };
  }, [companyId, categoryId]);

  const isSubmitDisabled = useMemo(
    () => submitting || categories.length === 0 || !description.trim() || !categoryId,
    [categories.length, categoryId, description, submitting]
  );

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(event.target.files ?? []);
    const imagesOnly = selected.filter((file) => file.type.startsWith("image/"));
    if (imagesOnly.length < selected.length) {
      notifications.warning({
        title: "Solo imagenes",
        description: "Por ahora solo se permiten imagenes (PNG, JPG, etc.).",
      });
    }
    if (imagesOnly.length > 3) {
      notifications.warning({
        title: "Maximo 3 imagenes",
        description: "Selecciona hasta 3 imagenes por ticket.",
      });
    }
    setFiles(imagesOnly.slice(0, 3));
  };

  const handleSubmit = async () => {
    if (!companyId || !customerId) return;
    if (!categoryId) {
      notifications.warning({
        title: "Categoria requerida",
        description: "Selecciona una categoria para continuar.",
      });
      return;
    }
    if (!description.trim()) {
      notifications.warning({
        title: "Descripcion requerida",
        description: "Describe el problema para poder ayudar.",
      });
      return;
    }

    setSubmitting(true);
    try {
      const created = await createTicket(
        companyId,
        customerId,
        {
          siteId: selectedSite || null,
          zoneId: selectedZone || null,
          categoryId,
          description: description.trim(),
          slaType,
        },
        files
      );

      notifications.success({
        title: "Ticket creado",
        description: `Se registro el ticket ${created.code}.`,
      });

      onSuccess?.(created);
    } catch (error) {
      notifications.error({
        title: "No se pudo crear ticket",
        description: error instanceof Error ? error.message : "Error inesperado.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="grid gap-4 md:grid-cols-2">
          <Field label="Sitio">
            <select
              value={selectedSite}
              onChange={(event) => setSelectedSite(event.target.value)}
              className="w-full h-12 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
            >
              <option value="">Selecciona un sitio</option>
              {sites.map((site) => (
                <option key={site.id} value={site.id}>
                  {site.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Zona">
            <select
              value={selectedZone}
              onChange={(event) => setSelectedZone(event.target.value)}
              className="w-full h-12 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
              disabled={!selectedSite}
            >
              <option value="">Selecciona una zona</option>
              {zones.map((zone) => (
                <option key={zone.id} value={zone.id}>
                  {zone.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Categoria">
            <select
              value={categoryId}
              onChange={(event) => setCategoryId(event.target.value)}
              className="w-full h-12 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
              disabled={categories.length === 0}
            >
              {categories.length === 0 && <option value="">Sin categorias disponibles</option>}
              {categories.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.name}
                </option>
              ))}
            </select>
            {selectedCategory?.description && (
              <p className="mt-1 text-xs text-slate-500">{selectedCategory.description}</p>
            )}
          </Field>
          <Field label="SLA">
            <select
              value={slaType}
              onChange={(event) => setSlaType(event.target.value as TicketSla)}
              className="w-full h-12 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
            >
              {SLA_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-slate-500">El SLA define el tiempo objetivo de respuesta.</p>
          </Field>
        </div>

      <div className="space-y-3">
        <Field label="Descripcion del problema">
          <textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            rows={4}
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
            placeholder="Describe el problema con el mayor detalle posible."
          />
        </Field>

        <Field label="Adjuntos (fotos o videos)">
          <label className="group flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-slate-300 bg-slate-50/60 px-4 py-6 text-center text-sm text-slate-600 transition hover:border-blue-300 hover:bg-blue-50/40">
            <input
              type="file"
              multiple
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
            />
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Subir archivos</span>
            <span className="text-sm text-slate-700">
              Arrastra y suelta aqui o haz clic para seleccionar
            </span>
            <span className="text-xs text-slate-400">PNG o JPG (max 3 imagenes)</span>
          </label>
        </Field>

        {files.length > 0 ? (
          <ul className="grid gap-2 text-xs text-slate-600 sm:grid-cols-2">
            {files.map((file) => (
              <li key={file.name} className="rounded-lg border border-slate-200 bg-white px-3 py-2">
                {file.name}
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      {categories.length === 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-700">
          No hay categorias configuradas. Contacta al administrador para habilitar opciones.
        </div>
      )}

      <div className="flex flex-wrap justify-end gap-2">
        {showCancel && (
          <Button
            type="button"
            onClick={onCancel}
            className="border-slate-300 bg-white text-slate-700 hover:bg-slate-100"
            disabled={submitting}
          >
            Cancelar
          </Button>
        )}
        <Button
          type="button"
          onClick={() => void handleSubmit()}
          disabled={isSubmitDisabled}
          className="border-blue-600 bg-blue-600 text-white hover:bg-blue-700"
        >
          {submitLabel}
        </Button>
      </div>
    </div>
  );
}
