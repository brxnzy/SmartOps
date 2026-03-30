import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Button from "../../components/Button";
import EmptyState from "../../components/EmptyState";
import Modal from "../../components/Modal";
import { useAuth } from "../../hooks/useAuth";
import { notifications } from "../../services/notification.service";
import { listSiteSurveys } from "../../services/siteSurvey.service";
import Field from "../../components/Field";
import type { SiteSurveySummary } from "../../types/siteSurvey.types";
import { createBudgetFromSurvey, listBudgets } from "../../services/budget.service";
import type { BudgetSummary } from "../../types/budget.types";

function formatDate(value: string) {
  return new Date(value).toLocaleString("es-DO");
}

export default function BudgetList() {
  const navigate = useNavigate();
  const { companyProfile, authUser } = useAuth();
  const companyId = companyProfile?.id ?? null;
  const userId = authUser?.id ?? null;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [surveys, setSurveys] = useState<SiteSurveySummary[]>([]);
  const [budgets, setBudgets] = useState<BudgetSummary[]>([]);

  const [createOpen, setCreateOpen] = useState(false);
  const [selectedSurveyId, setSelectedSurveyId] = useState("");

  const loadData = useCallback(async () => {
    if (!companyId) return;
    setLoading(true);
    setError(null);
    try {
      const [loadedSurveys, loadedBudgets] = await Promise.all([
        listSiteSurveys(companyId),
        listBudgets(companyId),
      ]);
      setSurveys(loadedSurveys);
      setBudgets(loadedBudgets);
    } catch (err) {
      const message = err instanceof Error ? err.message : "No se pudieron cargar los levantamientos.";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const surveyById = useMemo(() => new Map(surveys.map((survey) => [survey.id, survey])), [surveys]);

  const availableSurveys = useMemo(() => surveys, [surveys]);

  const handleCreate = async () => {
    if (!selectedSurveyId) {
      notifications.warning({
        title: "Seleccion requerida",
        description: "Elige un levantamiento para crear el presupuesto.",
      });
      return;
    }
    if (!companyId) return;

    try {
      const created = await createBudgetFromSurvey({
        companyId,
        surveyId: selectedSurveyId,
        createdBy: userId,
        taxRate: 0.18,
      });
      setCreateOpen(false);
      setSelectedSurveyId("");
      await loadData();
      navigate(`/admin/budgets/${created.id}`);
    } catch (err) {
      notifications.error({
        title: "Error creando presupuesto",
        description: err instanceof Error ? err.message : "No se pudo crear el presupuesto.",
      });
    }
  };

  return (
    <section className="space-y-6">
      <header className="rounded-2xl border border-slate-200 bg-gradient-to-r from-slate-900 via-slate-800 to-blue-900 p-6 text-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">Presupuestos</h1>
            <p className="mt-2 text-sm text-slate-200">Historial de presupuestos creados desde levantamientos.</p>
          </div>
          <Button
            type="button"
            onClick={() => setCreateOpen(true)}
            className="border-white/20 bg-white text-slate-900 hover:bg-slate-100"
          >
            Crear presupuesto
          </Button>
        </div>
      </header>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-900">Historial</h2>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
            {budgets.length} registros
          </span>
        </div>

        {loading ? (
          <div className="mt-4 text-sm text-slate-500">Cargando presupuestos...</div>
        ) : error ? (
          <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        ) : budgets.length === 0 ? (
          <div className="mt-4">
            <EmptyState text="Aun no hay presupuestos creados." />
          </div>
        ) : (
          <div className="mt-4 grid gap-3 lg:grid-cols-2">
            {budgets.map((budget) => {
              const survey = surveyById.get(budget.surveyId);
              return (
                <article
                  key={budget.id}
                  className="rounded-2xl border border-slate-200 bg-gradient-to-br from-white via-slate-50 to-blue-50 p-4 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">
                        {survey?.customerName ?? "Cliente"} � {survey?.siteName ?? "Sitio"}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">Levantamiento: {survey?.status ?? "Pendiente"}</p>
                      <p className="mt-1 text-xs text-slate-500">Creado: {formatDate(budget.createdAt)}</p>
                      <p className="mt-1 text-xs text-slate-500">Total: {budget.total.toLocaleString("es-DO", { style: "currency", currency: "USD" })}</p>
                    </div>
                    <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
                      {budget.status}
                    </span>
                  </div>
                <div className="mt-3 flex gap-2">
                  <Button
                    type="button"
                    onClick={() => navigate(`/admin/budgets/${budget.id}`)}
                    className="border-slate-300 bg-white text-slate-700 hover:bg-slate-100"
                  >
                    Abrir
                  </Button>
                </div>
              </article>
            );
          })}
          </div>
        )}
      </section>

      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Crear presupuesto"
        subtitle="Selecciona el levantamiento base."
        footer={
          <>
            <Button
              type="button"
              onClick={() => setCreateOpen(false)}
              className="border-slate-300 bg-white text-slate-700 hover:bg-slate-100"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={handleCreate}
              className="border-blue-600 bg-blue-600 text-white hover:bg-blue-700"
              disabled={!selectedSurveyId}
            >
              Crear
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <Field label="Levantamiento">
            <select
              value={selectedSurveyId}
              onChange={(event) => setSelectedSurveyId(event.target.value)}
              className="w-full rounded-xl border-2 border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 focus:border-blue-500 focus:outline-none"
            >
              <option value="">Selecciona un levantamiento</option>
              {availableSurveys.map((survey) => (
                <option key={survey.id} value={survey.id}>
                  {survey.customerName ?? "Cliente"} � {survey.siteName ?? "Sitio"} � {survey.status ?? "Pendiente"}
                </option>
              ))}
            </select>
          </Field>
          {availableSurveys.length === 0 && (
            <p className="text-xs text-slate-500">No hay levantamientos disponibles para crear presupuesto.</p>
          )}
        </div>
      </Modal>

    </section>
  );
}
