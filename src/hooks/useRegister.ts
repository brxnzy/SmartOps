import { useState, type ChangeEvent, type FormEvent } from "react";
import { registerUser } from "../services/auth.service";
import type { RegisterInput } from "../types/RegisterInput";
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
      await registerUser({ ...form });
      alert("Registro exitoso. Revisa tu correo para confirmar la cuenta.");
      setForm(initialForm);
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : "No se pudo completar el registro.";
      alert(`Error al registrar usuario: ${message}`);
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
