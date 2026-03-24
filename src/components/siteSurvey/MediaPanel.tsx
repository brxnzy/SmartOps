import { useEffect, useMemo, useState } from "react";
import { Camera, Trash2, Upload } from "lucide-react";
import Button from "../Button";
import { notifications } from "../../services/notification.service";
import {
  deleteSurveyMedia,
  listSurveyMedia,
  updateSurveyMediaMetadata,
  uploadSurveyMediaFiles,
} from "../../services/siteSurveyExecution.service";
import type { SurveyMediaItem, SurveyZoneOption } from "../../types/siteSurveyExecution.types";

interface MediaPanelProps {
  surveyId: string;
  companyId: string;
  zones: SurveyZoneOption[];
  initialMedia: SurveyMediaItem[];
  onMediaChange: (items: SurveyMediaItem[]) => void;
}

const CATEGORY_OPTIONS = ["General", "Cableado", "Dispositivo", "Evidencia", "Riesgo"];

function isImage(fileType: string | null): boolean {
  return Boolean(fileType?.startsWith("image/"));
}

function isVideo(fileType: string | null): boolean {
  return Boolean(fileType?.startsWith("video/"));
}

export default function MediaPanel({
  surveyId,
  companyId,
  zones,
  initialMedia,
  onMediaChange,
}: MediaPanelProps) {
  const [media, setMedia] = useState<SurveyMediaItem[]>(initialMedia);
  const [uploading, setUploading] = useState(false);
  const [workingId, setWorkingId] = useState<string | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploadCategory, setUploadCategory] = useState<string>("General");
  const [uploadZoneId, setUploadZoneId] = useState<string>("");
  const [uploadDescription, setUploadDescription] = useState<string>("");
  const [filterCategory, setFilterCategory] = useState<string>("all");

  useEffect(() => {
    setMedia(initialMedia);
  }, [initialMedia]);

  useEffect(() => {
    onMediaChange(media);
  }, [media, onMediaChange]);

  const reload = async () => {
    try {
      const data = await listSurveyMedia(surveyId);
      setMedia(data);
    } catch (error) {
      notifications.error({
        title: "Error cargando multimedia",
        description: error instanceof Error ? error.message : "No se pudo cargar la multimedia.",
      });
    }
  };

  const handleFileSelection = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedFiles(Array.from(event.target.files ?? []));
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0) {
      notifications.warning({
        title: "Selecciona archivos",
        description: "Debes elegir al menos un archivo para subir.",
      });
      return;
    }

    setUploading(true);
    try {
      await uploadSurveyMediaFiles({
        companyId,
        surveyId,
        files: selectedFiles,
        category: uploadCategory || null,
        zoneId: uploadZoneId || null,
        description: uploadDescription.trim() || null,
      });
      setSelectedFiles([]);
      setUploadDescription("");
      await reload();
      notifications.success({
        title: "Multimedia cargada",
        description: "Los archivos fueron cargados correctamente.",
      });
    } catch (error) {
      notifications.error({
        title: "Error subiendo archivos",
        description: error instanceof Error ? error.message : "No se pudieron subir los archivos.",
      });
    } finally {
      setUploading(false);
    }
  };

  const updateMetadata = async (
    mediaItem: SurveyMediaItem,
    patch: { category?: string | null; zoneId?: string | null; description?: string | null }
  ) => {
    const previous = media;

    setMedia((current) =>
      current.map((entry) =>
        entry.id === mediaItem.id
          ? {
              ...entry,
              category: patch.category !== undefined ? patch.category : entry.category,
              zoneId: patch.zoneId !== undefined ? patch.zoneId : entry.zoneId,
              description: patch.description !== undefined ? patch.description : entry.description,
            }
          : entry
      )
    );

    setWorkingId(mediaItem.id);
    try {
      await updateSurveyMediaMetadata(mediaItem.id, patch);
    } catch (error) {
      setMedia(previous);
      notifications.error({
        title: "Error guardando metadata",
        description: error instanceof Error ? error.message : "No se pudo actualizar el archivo.",
      });
    } finally {
      setWorkingId(null);
    }
  };

  const removeMedia = async (mediaItem: SurveyMediaItem) => {
    const previous = media;
    setMedia((current) => current.filter((entry) => entry.id !== mediaItem.id));
    setWorkingId(mediaItem.id);

    try {
      await deleteSurveyMedia(mediaItem.id, mediaItem.filePath);
    } catch (error) {
      setMedia(previous);
      notifications.error({
        title: "Error eliminando archivo",
        description: error instanceof Error ? error.message : "No se pudo eliminar el archivo.",
      });
    } finally {
      setWorkingId(null);
    }
  };

  const categoryFilters = useMemo(() => {
    const dynamic = new Set(CATEGORY_OPTIONS);
    media.forEach((item) => {
      if (item.category) dynamic.add(item.category);
    });
    return ["all", ...Array.from(dynamic)];
  }, [media]);

  const filteredMedia = useMemo(() => {
    if (filterCategory === "all") return media;
    return media.filter((item) => (item.category ?? "General") === filterCategory);
  }, [filterCategory, media]);

  return (
    <article className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <header className="flex items-center justify-between">
        <h3 className="inline-flex items-center gap-2 text-sm font-semibold text-slate-900">
          <Camera size={16} className="text-slate-500" />
          Multimedia
        </h3>
        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">{media.length} archivos</span>
      </header>

      <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-3">
        <input
          type="file"
          multiple
          onChange={handleFileSelection}
          className="w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-xs text-slate-700"
        />

        <div className="grid gap-2 md:grid-cols-2">
          <label className="text-xs font-medium text-slate-500">
            Categoria
            <select
              value={uploadCategory}
              onChange={(event) => setUploadCategory(event.target.value)}
              className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1.5 text-xs text-slate-700"
            >
              {CATEGORY_OPTIONS.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </label>

          <label className="text-xs font-medium text-slate-500">
            Zona
            <select
              value={uploadZoneId}
              onChange={(event) => setUploadZoneId(event.target.value)}
              className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1.5 text-xs text-slate-700"
            >
              <option value="">Sin zona</option>
              {zones.map((zone) => (
                <option key={zone.id} value={zone.id}>
                  {zone.name}
                </option>
              ))}
            </select>
          </label>
        </div>

        <textarea
          value={uploadDescription}
          onChange={(event) => setUploadDescription(event.target.value)}
          placeholder="Descripcion opcional"
          className="min-h-[64px] w-full rounded-md border border-slate-300 px-2 py-1.5 text-xs text-slate-700 focus:border-blue-500 focus:outline-none"
        />

        <Button
          type="button"
          onClick={() => void handleUpload()}
          disabled={uploading || selectedFiles.length === 0}
          className="border-blue-600 bg-blue-600 text-white hover:bg-blue-700"
          icon={<Upload size={14} />}
        >
          {uploading ? "Subiendo..." : "Subir archivos"}
        </Button>
      </div>

      <div className="flex items-center gap-2">
        <label className="text-xs font-medium text-slate-500">
          Filtrar por categoria
          <select
            value={filterCategory}
            onChange={(event) => setFilterCategory(event.target.value)}
            className="ml-2 rounded-md border border-slate-300 px-2 py-1 text-xs text-slate-700"
          >
            {categoryFilters.map((category) => (
              <option key={category} value={category}>
                {category === "all" ? "Todas" : category}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="space-y-3">
        {filteredMedia.length === 0 ? (
          <p className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-3 py-3 text-xs text-slate-500">
            No hay archivos para esta categoria.
          </p>
        ) : (
          filteredMedia.map((item) => (
            <div key={item.id} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <div className="grid gap-3 md:grid-cols-[180px_1fr]">
                <div className="overflow-hidden rounded-lg border border-slate-200 bg-black/80">
                  {isImage(item.fileType) ? (
                    <img src={item.signedUrl} alt={item.description ?? "Evidencia"} className="h-36 w-full object-cover" />
                  ) : isVideo(item.fileType) ? (
                    <video src={item.signedUrl} controls className="h-36 w-full object-cover" />
                  ) : (
                    <a
                      href={item.signedUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="flex h-36 items-center justify-center px-2 text-xs text-white underline"
                    >
                      Abrir archivo
                    </a>
                  )}
                </div>

                <div className="space-y-2">
                  <div className="grid gap-2 md:grid-cols-2">
                    <label className="text-xs font-medium text-slate-500">
                      Categoria
                      <select
                        value={item.category ?? "General"}
                        disabled={workingId === item.id}
                        onChange={(event) => {
                          void updateMetadata(item, { category: event.target.value });
                        }}
                        className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1.5 text-xs text-slate-700"
                      >
                        {CATEGORY_OPTIONS.map((category) => (
                          <option key={category} value={category}>
                            {category}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="text-xs font-medium text-slate-500">
                      Zona
                      <select
                        value={item.zoneId ?? ""}
                        disabled={workingId === item.id}
                        onChange={(event) => {
                          void updateMetadata(item, { zoneId: event.target.value || null });
                        }}
                        className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1.5 text-xs text-slate-700"
                      >
                        <option value="">Sin zona</option>
                        {zones.map((zone) => (
                          <option key={zone.id} value={zone.id}>
                            {zone.name}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>

                  <textarea
                    defaultValue={item.description ?? ""}
                    onBlur={(event) => {
                      void updateMetadata(item, { description: event.target.value.trim() || null });
                    }}
                    disabled={workingId === item.id}
                    placeholder="Descripcion"
                    className="min-h-[70px] w-full rounded-md border border-slate-300 px-2 py-1.5 text-xs text-slate-700"
                  />

                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-slate-500">
                      {item.createdAt ? new Date(item.createdAt).toLocaleString("es-DO") : "Sin fecha"}
                    </span>
                    <button
                      type="button"
                      onClick={() => void removeMedia(item)}
                      disabled={workingId === item.id}
                      className="inline-flex items-center gap-1 rounded-md border border-red-200 bg-red-50 px-2 py-1 text-xs text-red-700 hover:bg-red-100"
                    >
                      <Trash2 size={12} />
                      Eliminar
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </article>
  );
}
