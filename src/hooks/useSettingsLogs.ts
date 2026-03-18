import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "../libs/supabase";
import { notifications } from "../services/notification.service";
import useAuth from "./useAuth";
import type { AuditLogEntry } from "../types/interfaces";

type AuditLogUser = AuditLogEntry["user"];
type AuditLogRow = Omit<AuditLogEntry, "user"> & {
  users?: AuditLogUser | AuditLogUser[] | null;
};

const normalizeAuditLogEntry = (row: AuditLogRow): AuditLogEntry => {
  const user = Array.isArray(row.users) ? row.users[0] ?? null : row.users ?? null;

  return {
    id: row.id,
    user_id: row.user_id ?? null,
    company_id: row.company_id ?? null,
    action: row.action,
    entity: row.entity,
    entity_id: row.entity_id ?? null,
    old_values: row.old_values ?? null,
    new_values: row.new_values ?? null,
    created_at: row.created_at,
    user,
  };
};

const TIME_FORMATTER = new Intl.DateTimeFormat("es-DO", {
  hour: "2-digit",
  minute: "2-digit",
});

const DATE_FORMATTER = new Intl.DateTimeFormat("es-DO", {
  year: "numeric",
  month: "short",
  day: "numeric",
});

const formatDate = (value: string | null) => {
  if (!value) return "Sin fecha";
  const timestamp = Date.parse(value);
  if (Number.isNaN(timestamp)) return "Sin fecha";
  return DATE_FORMATTER.format(new Date(timestamp));
};

const formatTime = (value: string | null) => {
  if (!value) return "Sin fecha";
  const timestamp = Date.parse(value);
  if (Number.isNaN(timestamp)) return "Sin fecha";
  return TIME_FORMATTER.format(new Date(timestamp));
};

const formatActionLabel = (value: string) =>
  value
    .replace(/_/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const getAffectedLabel = (log: {
  entity: string;
  entity_id: string | null;
  new_values: Record<string, unknown> | null;
  old_values: Record<string, unknown> | null;
}) => {
  const newName = typeof log.new_values?.name === "string" ? log.new_values.name : null;
  const oldName = typeof log.old_values?.name === "string" ? log.old_values.name : null;
  const code = typeof log.new_values?.code === "string" ? log.new_values.code : null;
  const userId = typeof log.new_values?.userId === "string" ? log.new_values.userId : null;
  const reference = newName ?? code ?? userId ?? oldName ?? log.entity_id ?? "";
  return reference ? `${log.entity}: ${reference}` : log.entity;
};

const MAX_LOGS = 200;



const useSettingsLogs = () => {
  const { companyProfile } = useAuth();
  const companyId = companyProfile?.id ?? null;
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [entityFilter, setEntityFilter] = useState("all");
  const [actionFilter, setActionFilter] = useState("all");

  const loadLogs = useCallback(async () => {
    if (!companyId) {
      setLogs([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const { data, error: fetchError } = await supabase
      .from("audit_logs")
      .select(
        "id, user_id, company_id, action, entity, entity_id, old_values, new_values, created_at, users:user_id ( id, name, photo_url )"
      )
      .eq("company_id", companyId)
      .order("created_at", { ascending: false })
      .limit(MAX_LOGS)
      .overrideTypes<AuditLogRow[], { merge: false }>();

    if (fetchError) {
      setError(fetchError.message);
      notifications.error({
        title: "Error cargando la bitacora",
        description: "No se pudieron obtener los logs de auditoria.",
      });
      setLogs([]);
      setLoading(false);
      return;
    }

    const rows = data ?? [];
    const mapped = rows.map(normalizeAuditLogEntry);
    setLogs(mapped);
    setLoading(false);
  }, [companyId]);

  useEffect(() => {
    let isActive = true;

    Promise.resolve().then(() => {
      if (!isActive) return;
      void loadLogs();
    });

    return () => {
      isActive = false;
    };
  }, [loadLogs]);

  const entities = useMemo(() => {
    const unique = new Set<string>();
    logs.forEach((log) => {
      if (log.entity) {
        unique.add(log.entity);
      }
    });
    return Array.from(unique).sort((a, b) => a.localeCompare(b));
  }, [logs]);

  const actions = useMemo(() => {
    const unique = new Set<string>();
    logs.forEach((log) => {
      if (log.action) {
        unique.add(log.action);
      }
    });
    return Array.from(unique).sort((a, b) => a.localeCompare(b));
  }, [logs]);

  const filteredLogs = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    return logs.filter((log) => {
      if (entityFilter !== "all" && log.entity !== entityFilter) return false;
      if (actionFilter !== "all" && log.action !== actionFilter) return false;
      if (!query) return true;

      return (
        log.action.toLowerCase().includes(query) ||
        log.entity.toLowerCase().includes(query) ||
        (log.entity_id ?? "").toLowerCase().includes(query) ||
        (log.user_id ?? "").toLowerCase().includes(query) ||
        (log.user?.name ?? "").toLowerCase().includes(query)
      );
    });
  }, [actionFilter, entityFilter, logs, searchTerm]);

  return {
    companyId,
    logs,
    filteredLogs,
    entities,
    actions,
    loading,
    error,
    searchTerm,
    setSearchTerm,
    entityFilter,
    setEntityFilter,
    actionFilter,
    formatDate,
    getAffectedLabel,
    formatTime,
    formatActionLabel,
    setActionFilter,
    reload: loadLogs,
  };
};

export default useSettingsLogs;
