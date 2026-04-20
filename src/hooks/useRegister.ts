import { useState, type ChangeEvent, type FormEvent } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { registerUser } from "../services/auth.service";
import { notifications } from "../services/notification.service";
import type { RegisterInput } from "../types/types";
import { translateAuthError } from "../utils/authErrorMessages";
import { formatIdCard, formatPhone } from "../utils/format";

const PENDING_PLAN_STORAGE_KEY = "pending_plan_key";
const allowedPlans = new Set(["basic", "pro", "enterprise"]);

const initialForm: RegisterInput = {
  name: "",
  email: "",
  password: "",
  idCard: "",
  companyName: "",
  companyAddress: "",
  companyPhone: "",
  companyRnc: "",
  planKey: null,
};

const useRegister = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [form, setForm] = useState<RegisterInput>(initialForm);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleFieldChange =
    (field: keyof RegisterInput) => (e: ChangeEvent<HTMLInputElement>) => {
      setForm((prev) => ({ ...prev, [field]: e.target.value }));
    };

  const handleIdCardChange = (e: ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({
      ...prev,
      idCard: formatIdCard(e.target.value),
    }));
  };

  const handleCompanyPhoneChange = (e: ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({
      ...prev,
      companyPhone: formatPhone(e.target.value),
    }));
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isSubmitting) return;

    const planParam = (searchParams.get("plan") ?? "").trim().toLowerCase();
    const planKey = allowedPlans.has(planParam) ? planParam : null;

    try {
      setIsSubmitting(true);
      if (planKey) {
        localStorage.setItem(PENDING_PLAN_STORAGE_KEY, planKey);
      }
      await notifications.promise(
        () => registerUser({ ...form, planKey, email: form.email.trim().toLowerCase() }),
        {
          loading: {
            title: "Creando cuenta...",
            description: "Estamos registrando tu usuario.",
          },
          success: {
            title: "Registro completado",
            description: "Revisa tu correo para confirmar tu cuenta.",
          },
          error: (error) => ({
            title: "Error al registrar usuario",
            description: translateAuthError(error, "No se pudo completar el registro."),
          }),
        }
      );
      const email = form.email.trim().toLowerCase();
      sessionStorage.setItem("pending_verification_email", email);
      navigate("/verify", {
        replace: true,
        state: { email },
      });

      setForm(initialForm);
    } catch {
      if (planKey) {
        localStorage.removeItem(PENDING_PLAN_STORAGE_KEY);
      }
      // Toasts are handled by notifications.promise.
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    form,
    isSubmitting,
    handleSubmit,
    handleFieldChange,
    handleIdCardChange,
    handleCompanyPhoneChange,
  };
};

export default useRegister;
