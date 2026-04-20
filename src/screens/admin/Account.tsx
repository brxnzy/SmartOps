import { useEffect, useMemo, useState } from "react";
import { Banknote, CreditCard, ImageOff, Lock, UserRound, Wallet } from "lucide-react";
import Button from "../../components/Button";
import Field from "../../components/Field";
import FileInput from "../../components/FileInput";
import Input from "../../components/Input";
import Modal from "../../components/Modal";
import useAuth from "../../hooks/useAuth";
import useCompanyEntitlements from "../../hooks/useCompanyEntitlements";
import {
  deleteUserPhoto,
  updateUserProfile,
  uploadUserPhoto,
} from "../../services/profile.service";
import { notifications } from "../../services/notification.service";
import { listActivePricingPlans } from "../../services/pricing.service";
import { changeCompanyPlan } from "../../services/subscription.service";
import type { PricingPlan } from "../../types/billing.types";

export default function Account() {
  const { authUser, userProfile, companyProfile, refreshProfile } = useAuth();
  const { entitlements, refresh: refreshEntitlements } = useCompanyEntitlements();
  const [name, setName] = useState("");
  const [idCard, setIdCard] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [removePhoto, setRemovePhoto] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [fileInputKey, setFileInputKey] = useState(0);

  const [plans, setPlans] = useState<PricingPlan[]>([]);
  const [plansLoading, setPlansLoading] = useState(false);
  const [plansError, setPlansError] = useState<string | null>(null);

  const [isUpgradeModalOpen, setUpgradeModalOpen] = useState(false);
  const [selectedPlanKey, setSelectedPlanKey] = useState<string | null>(null);
  const [isPaymentModalOpen, setPaymentModalOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"card" | "transfer" | "paypal">("card");
  const [cardName, setCardName] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardCvc, setCardCvc] = useState("");
  const [upgrading, setUpgrading] = useState(false);

  useEffect(() => {
    setName(userProfile?.name ?? "");
    setIdCard(userProfile?.idCard ?? "");
    setSelectedFile(null);
    setRemovePhoto(false);
    setFileInputKey((current) => current + 1);
  }, [userProfile?.id, userProfile?.name, userProfile?.idCard, userProfile?.photoUrl]);

  const hasChanges = useMemo(() => {
    const cleanName = name.trim();
    const cleanIdCard = idCard.trim();
    const initialName = userProfile?.name?.trim() ?? "";
    const initialIdCard = userProfile?.idCard?.trim() ?? "";

    const nameChanged = cleanName !== initialName;
    const idCardChanged = cleanIdCard !== initialIdCard;
    const photoChanged = Boolean(selectedFile) || (removePhoto && !!userProfile?.photoUrl);

    return nameChanged || idCardChanged || photoChanged;
  }, [idCard, name, removePhoto, selectedFile, userProfile?.idCard, userProfile?.name, userProfile?.photoUrl]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    setSelectedFile(file);
    if (file) {
      setRemovePhoto(false);
    }
  };

  const handleRemovePhoto = () => {
    setSelectedFile(null);
    setRemovePhoto(true);
    setFileInputKey((current) => current + 1);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!authUser?.id) return;

    const cleanName = name.trim();
    const cleanIdCard = idCard.trim();

    if (!cleanName) {
      notifications.warning({
        title: "Nombre requerido",
        description: "Ingresa tu nombre para guardar los cambios.",
      });
      return;
    }

    setSubmitting(true);

    try {
      let photoUrl: string | null | undefined = undefined;

      if (selectedFile) {
        photoUrl = await uploadUserPhoto({ userId: authUser.id, file: selectedFile });
      }

      if (removePhoto) {
        await deleteUserPhoto(authUser.id);
        photoUrl = null;
      }

      await updateUserProfile({
        userId: authUser.id,
        name: cleanName,
        idCard: cleanIdCard || null,
        photoUrl,
      });

      await refreshProfile();
      setSelectedFile(null);
      setRemovePhoto(false);
      setFileInputKey((current) => current + 1);

      notifications.success({
        title: "Perfil actualizado",
        description: "Tus datos fueron guardados correctamente.",
      });
    } catch (error) {
      notifications.error({
        title: "No se pudieron guardar los cambios",
        description: error instanceof Error ? error.message : "Intenta nuevamente.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
    let active = true;
    setPlansLoading(true);
    setPlansError(null);

    listActivePricingPlans()
      .then((data) => {
        if (!active) return;
        setPlans(data);
      })
      .catch((err) => {
        console.error(err);
        if (!active) return;
        setPlans([]);
        setPlansError(err instanceof Error ? err.message : "No se pudieron cargar los planes.");
      })
      .finally(() => {
        if (!active) return;
        setPlansLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const currentPlan = useMemo(() => {
    if (!entitlements?.planKey) return null;
    return plans.find((plan) => plan.key === entitlements.planKey) ?? null;
  }, [entitlements?.planKey, plans]);

  const selectedPlan = useMemo(() => {
    if (!selectedPlanKey) return null;
    return plans.find((plan) => plan.key === selectedPlanKey) ?? null;
  }, [plans, selectedPlanKey]);

  const openUpgradeFlow = () => {
    if (!companyProfile?.id) {
      notifications.warning({
        title: "Sin compañía",
        description: "No tienes una compañía activa para cambiar el plan.",
      });
      return;
    }

    setSelectedPlanKey(null);
    setPaymentMethod("card");
    setCardName("");
    setCardNumber("");
    setCardExpiry("");
    setCardCvc("");
    setUpgradeModalOpen(true);
  };

  const closeUpgradeFlow = () => {
    if (upgrading) return;
    setUpgradeModalOpen(false);
    setPaymentModalOpen(false);
    setSelectedPlanKey(null);
  };

  const continueToPayment = () => {
    if (!selectedPlanKey) {
      notifications.warning({
        title: "Selecciona un plan",
        description: "Debes seleccionar el plan al que quieres mejorar.",
      });
      return;
    }

    setUpgradeModalOpen(false);
    setPaymentModalOpen(true);
  };

  const normalizeCardNumber = (value: string) => value.replace(/[^\d]/g, "").slice(0, 19);
  const formatCardNumber = (value: string) => {
    const digits = normalizeCardNumber(value);
    return digits.replace(/(\d{4})(?=\d)/g, "$1 ").trim();
  };

  const normalizeExpiry = (value: string) => {
    const digits = value.replace(/[^\d]/g, "").slice(0, 4);
    if (digits.length <= 2) return digits;
    return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  };

  const isCardFormValid = useMemo(() => {
    if (paymentMethod !== "card") return true;

    const digits = normalizeCardNumber(cardNumber);
    const expiry = cardExpiry.trim();
    const cvc = cardCvc.replace(/[^\d]/g, "");

    if (cardName.trim().length < 3) return false;
    if (digits.length < 13) return false;
    if (!/^\d{2}\/\d{2}$/.test(expiry)) return false;
    if (cvc.length < 3) return false;
    return true;
  }, [cardCvc, cardExpiry, cardName, cardNumber, paymentMethod]);

  const confirmUpgrade = async () => {
    if (!companyProfile?.id) return;
    if (!selectedPlanKey) return;

    if (!isCardFormValid) {
      notifications.warning({
        title: "Datos incompletos",
        description: "Completa los datos de pago antes de continuar.",
      });
      return;
    }

    setUpgrading(true);
    try {
      await changeCompanyPlan(companyProfile.id, selectedPlanKey);
      await refreshEntitlements();
      try {
        localStorage.removeItem("pending_plan_key");
        sessionStorage.removeItem("pending_plan_key");
      } catch {
        // ignore
      }
      window.dispatchEvent(new Event("company-plan-changed"));

      notifications.success({
        title: "Plan actualizado",
        description: "Tu plan fue actualizado correctamente.",
      });

      closeUpgradeFlow();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Intenta nuevamente.";
      const maybeMissingRpc =
        typeof message === "string" &&
        (message.includes("Could not find the function") || message.toLowerCase().includes("schema cache"));

      notifications.error({
        title: "No se pudo actualizar el plan",
        description: maybeMissingRpc
          ? "La función de upgrade no está instalada aún. Aplica las migraciones de Supabase y recarga."
          : message,
      });
    } finally {
      setUpgrading(false);
    }
  };

  return (
    <section className="space-y-6">
      <header className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <h1 className="text-3xl font-semibold text-slate-900">Mi cuenta</h1>
            <p className="text-sm text-slate-500">
              Actualiza tu informacion personal y tu foto de perfil.
            </p>
          </div>
          <div className="flex items-center gap-3">
            {userProfile?.photoUrl && !removePhoto ? (
              <img
                src={userProfile.photoUrl}
                alt={userProfile?.name ?? "Foto de perfil"}
                className="h-14 w-14 rounded-full object-cover border border-slate-200 bg-white"
              />
            ) : (
              <UserRound size={56} className="text-slate-400" />
            )}
          </div>
        </div>
      </header>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1">
            <h2 className="text-lg font-semibold text-slate-900">Plan</h2>
            <p className="text-sm text-slate-500">Consulta tu plan actual y mejora cuando lo necesites.</p>
          </div>
          <Button
            type="button"
            onClick={openUpgradeFlow}
            disabled={plansLoading || upgrading}
            className="border-blue-600 bg-blue-600 text-white hover:bg-blue-700"
          >
            Mejorar plan
          </Button>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <article className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">Plan actual</p>
            <p className="mt-2 text-lg font-semibold text-slate-900">{entitlements?.planName ?? "Sin plan"}</p>
            <p className="mt-1 text-sm text-slate-600">
              {currentPlan?.price && currentPlan.price > 0 ? `USD ${currentPlan.price}/${currentPlan.billingCycle}` : "Gratis"}
            </p>
            {plansError ? <p className="mt-2 text-xs text-amber-700">{plansError}</p> : null}
          </article>

          <article className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">Límites</p>
            <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm text-slate-700">
              <div>
                <dt className="text-xs text-slate-500">Usuarios</dt>
                <dd className="font-semibold">{entitlements?.limits?.maxTechnicians ?? "Ilimitado"}</dd>
              </div>
              <div>
                <dt className="text-xs text-slate-500">Clientes</dt>
                <dd className="font-semibold">{entitlements?.limits?.maxClients ?? "Ilimitado"}</dd>
              </div>
              <div>
                <dt className="text-xs text-slate-500">Sitios</dt>
                <dd className="font-semibold">{entitlements?.limits?.maxSites ?? "Ilimitado"}</dd>
              </div>
              <div>
                <dt className="text-xs text-slate-500">Dispositivos</dt>
                <dd className="font-semibold">{entitlements?.limits?.maxDevices ?? "Ilimitado"}</dd>
              </div>
            </dl>
          </article>
        </div>
      </section>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <Field label="Nombre">
            <Input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Tu nombre completo"
              maxLength={120}
            />
          </Field>

          <Field label="Cedula">
            <Input
              value={idCard}
              onChange={(event) => setIdCard(event.target.value)}
              placeholder="Ejemplo: 001-0000000-0"
              maxLength={40}
            />
          </Field>

          <FileInput
            key={fileInputKey}
            id="profile-photo"
            label="Foto de perfil"
            accept="image/*"
            onChange={handleFileChange}
            disabled={submitting}
          />

          {userProfile?.photoUrl ? (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
              <p>
                Foto actual guardada. Si quieres quitarla, usa el boton de abajo.
              </p>
              <Button
                type="button"
                onClick={handleRemovePhoto}
                disabled={submitting}
                className="border-red-300 text-red-700 hover:bg-red-50"
                icon={<ImageOff size={16} />}
              >
                Quitar foto
              </Button>
            </div>
          ) : null}

          {removePhoto ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700">
              Se eliminara tu foto actual al guardar.
            </div>
          ) : null}
        </div>

        <div className="flex items-center justify-end gap-2">
          <Button
            type="submit"
            disabled={submitting || !hasChanges}
            className="border-blue-600 bg-blue-600 text-white hover:bg-blue-700"
          >
            Guardar cambios
          </Button>
        </div>
      </form>

      <Modal
        open={isUpgradeModalOpen}
        onClose={closeUpgradeFlow}
        title="Mejorar plan"
        subtitle="Selecciona el plan al que quieres mejorar."
        size="xl"
        containerClassName="max-h-[90vh] overflow-hidden"
        bodyClassName="max-h-[65vh] overflow-auto"
        footer={
          <>
            <Button type="button" onClick={closeUpgradeFlow} className="border-slate-200 bg-white text-slate-700 hover:bg-slate-50">
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={continueToPayment}
              disabled={!selectedPlanKey || plansLoading || upgrading}
              className="border-blue-600 bg-blue-600 text-white hover:bg-blue-700"
            >
              Continuar
            </Button>
          </>
        }
      >
        {plansLoading ? (
          <p className="text-sm text-slate-500">Cargando planes...</p>
        ) : plans.length === 0 ? (
          <p className="text-sm text-slate-500">No hay planes disponibles.</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-3">
            {plans.map((plan) => {
              const isCurrent = plan.key === entitlements?.planKey;
              const isSelected = plan.key === selectedPlanKey;
              const priceLabel = plan.price && plan.price > 0 ? `USD ${plan.price}/${plan.billingCycle}` : "Gratis";

              return (
                <button
                  key={plan.key}
                  type="button"
                  disabled={isCurrent}
                  onClick={() => setSelectedPlanKey(plan.key)}
                  className={[
                    "rounded-2xl border p-4 text-left transition focus:outline-none",
                    isCurrent
                      ? "cursor-not-allowed border-slate-200 bg-slate-50 opacity-70"
                      : "border-slate-200 bg-white hover:border-blue-300 hover:shadow-sm",
                    isSelected ? "ring-2 ring-blue-500 ring-offset-2 ring-offset-white" : "",
                  ].join(" ")}
                >
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-sm font-semibold text-slate-900">{plan.name}</p>
                    <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-semibold text-slate-700">
                      {priceLabel}
                    </span>
                  </div>
                  <p className="mt-2 text-xs text-slate-600">{plan.description ?? ""}</p>
                  {isCurrent ? (
                    <p className="mt-3 text-[11px] font-semibold text-emerald-700">Plan actual</p>
                  ) : null}
                </button>
              );
            })}
          </div>
        )}
      </Modal>

      <Modal
        open={isPaymentModalOpen}
        onClose={closeUpgradeFlow}
        title="Pago"
        subtitle="Selecciona un método de pago para completar la compra."
        size="xl"
        containerClassName="max-h-[90vh] overflow-hidden"
        bodyClassName="max-h-[65vh] overflow-auto"
        footer={
          <>
            <Button
              type="button"
              onClick={() => {
                if (upgrading) return;
                setPaymentModalOpen(false);
                setUpgradeModalOpen(true);
              }}
              className="border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
            >
              Atrás
            </Button>
            <Button
              type="button"
              onClick={confirmUpgrade}
              disabled={upgrading || !isCardFormValid}
              className="border-blue-600 bg-blue-600 text-white hover:bg-blue-700"
            >
              Confirmar pago
            </Button>
          </>
        }
      >
        <div className="grid gap-5 lg:grid-cols-5">
          <div className="lg:col-span-3 space-y-4">
            <div className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                <Lock size={16} className="text-emerald-600" />
                Pago seguro
              </div>
              <p className="text-xs text-slate-500">Procesamiento encriptado</p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <button
                type="button"
                onClick={() => setPaymentMethod("card")}
                className={[
                  "group flex items-center gap-3 rounded-2xl border p-4 text-left transition focus:outline-none",
                  paymentMethod === "card"
                    ? "border-blue-300 bg-blue-50 ring-2 ring-blue-500/30"
                    : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50",
                ].join(" ")}
              >
                <span
                  className={[
                    "inline-flex h-10 w-10 items-center justify-center rounded-xl border",
                    paymentMethod === "card" ? "border-blue-200 bg-white text-blue-700" : "border-slate-200 bg-slate-50 text-slate-600",
                  ].join(" ")}
                >
                  <CreditCard size={18} />
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-900">Tarjeta</p>
                  <p className="text-xs text-slate-500">Crédito o débito</p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod("transfer")}
                className={[
                  "group flex items-center gap-3 rounded-2xl border p-4 text-left transition focus:outline-none",
                  paymentMethod === "transfer"
                    ? "border-blue-300 bg-blue-50 ring-2 ring-blue-500/30"
                    : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50",
                ].join(" ")}
              >
                <span
                  className={[
                    "inline-flex h-10 w-10 items-center justify-center rounded-xl border",
                    paymentMethod === "transfer"
                      ? "border-blue-200 bg-white text-blue-700"
                      : "border-slate-200 bg-slate-50 text-slate-600",
                  ].join(" ")}
                >
                  <Banknote size={18} />
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-900">Transferencia</p>
                  <p className="text-xs text-slate-500">Banca en línea</p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod("paypal")}
                className={[
                  "group flex items-center gap-3 rounded-2xl border p-4 text-left transition focus:outline-none",
                  paymentMethod === "paypal"
                    ? "border-blue-300 bg-blue-50 ring-2 ring-blue-500/30"
                    : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50",
                ].join(" ")}
              >
                <span
                  className={[
                    "inline-flex h-10 w-10 items-center justify-center rounded-xl border",
                    paymentMethod === "paypal"
                      ? "border-blue-200 bg-white text-blue-700"
                      : "border-slate-200 bg-slate-50 text-slate-600",
                  ].join(" ")}
                >
                  <Wallet size={18} />
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-900">PayPal</p>
                  <p className="text-xs text-slate-500">Pago rápido</p>
                </div>
              </button>
            </div>

            {paymentMethod === "card" ? (
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-slate-900">Datos de tarjeta</p>
                  <p className="text-xs text-slate-500">Visa, Mastercard, Amex</p>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <Field label="Nombre en la tarjeta">
                    <Input
                      value={cardName}
                      onChange={(e) => setCardName(e.target.value)}
                      placeholder="Ej. Juan Pérez"
                      maxLength={80}
                    />
                  </Field>

                  <Field label="Número de tarjeta">
                    <Input
                      value={cardNumber}
                      onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
                      inputMode="numeric"
                      placeholder="1234 5678 9012 3456"
                      maxLength={23}
                    />
                  </Field>

                  <Field label="Expiración">
                    <Input
                      value={cardExpiry}
                      onChange={(e) => setCardExpiry(normalizeExpiry(e.target.value))}
                      inputMode="numeric"
                      placeholder="MM/YY"
                      maxLength={5}
                    />
                  </Field>

                  <Field label="CVC">
                    <Input
                      value={cardCvc}
                      onChange={(e) => setCardCvc(e.target.value.replace(/[^\d]/g, "").slice(0, 4))}
                      inputMode="numeric"
                      placeholder="123"
                      maxLength={4}
                    />
                  </Field>
                </div>

                {!isCardFormValid ? (
                  <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
                    Completa los datos de la tarjeta para continuar.
                  </div>
                ) : null}
              </div>
            ) : (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 text-sm text-slate-700">
                <p className="font-semibold text-slate-900">Confirmación</p>
                <p className="mt-1 text-sm text-slate-600">
                  Revisa el resumen y confirma para completar el pago.
                </p>
              </div>
            )}
          </div>

          <aside className="lg:col-span-2 space-y-4">
            <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-slate-900 p-5 text-white shadow-sm">
              <div className="pointer-events-none absolute inset-0 opacity-70">
                <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-blue-500/40 blur-3xl" />
                <div className="absolute -left-10 bottom-0 h-40 w-40 rounded-full bg-emerald-500/30 blur-3xl" />
              </div>
              <div className="relative space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-white/70">Tarjeta</p>
                  <span className="rounded-full bg-white/10 px-2 py-0.5 text-[11px] font-semibold text-white/80">
                    {paymentMethod === "card" ? "Seleccionada" : "Opcional"}
                  </span>
                </div>

                <p className="font-mono text-lg tracking-widest">
                  {paymentMethod === "card" && cardNumber.trim()
                    ? cardNumber
                    : "•••• •••• •••• ••••"}
                </p>

                <div className="flex items-end justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[11px] text-white/70">Nombre</p>
                    <p className="truncate text-sm font-semibold">{cardName.trim() || "—"}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[11px] text-white/70">Expira</p>
                    <p className="text-sm font-semibold">{cardExpiry.trim() || "—"}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-900">Resumen</p>
                  <p className="mt-1 text-xs text-slate-500">Revisa antes de confirmar</p>
                </div>
                <div className="text-right">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Total</p>
                  <p className="text-lg font-bold text-slate-900">
                    {selectedPlan?.price && selectedPlan.price > 0 ? `USD ${selectedPlan.price}` : "USD 0"}
                  </p>
                </div>
              </div>

              <dl className="mt-4 space-y-2 text-sm text-slate-700">
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-slate-500">Plan</dt>
                  <dd className="font-semibold text-slate-900">{selectedPlan?.name ?? "—"}</dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-slate-500">Ciclo</dt>
                  <dd className="font-semibold text-slate-900">
                    {selectedPlan?.billingCycle === "annual" ? "Anual" : "Mensual"}
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-slate-500">Método</dt>
                  <dd className="font-semibold text-slate-900">
                    {paymentMethod === "card" ? "Tarjeta" : paymentMethod === "transfer" ? "Transferencia" : "PayPal"}
                  </dd>
                </div>
              </dl>

              <div className="mt-4 rounded-xl border border-slate-200 bg-white p-3 text-xs text-slate-600">
                Al confirmar, el plan se actualiza inmediatamente.
              </div>
            </div>
          </aside>
        </div>
      </Modal>
    </section>
  );
}
