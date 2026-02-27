import { useState, type ChangeEvent, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { registerUser } from "../services/auth.service";
import { notifications } from "../services/notification.service";
import type { RegisterInput } from "../types/types";
import { translateAuthError } from "../utils/authErrorMessages";
import { formatIdCard, formatPhone } from "../utils/format";

const initialForm: RegisterInput = {
  name: "",
  email: "",
  password: "",
  idCard: "",
  companyName: "",
  companyAddress: "",
  companyPhone: "",
  companyRnc: "",
};

export const useRegister = () => {
  const navigate = useNavigate();
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

    try {
      setIsSubmitting(true);
      await notifications.promise(
        () => registerUser({ ...form, email: form.email.trim().toLowerCase() }),
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
