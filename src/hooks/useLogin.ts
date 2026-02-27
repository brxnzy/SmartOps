import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { loginUser } from "../services/auth.service";
import { notifications } from "../services/notification.service";
import {
  isEmailNotConfirmedError,
  translateAuthError,
} from "../utils/authErrorMessages";

const useLogin = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    email: "",
    password: "",
  });

  const handleChange = (key: string, value: string) => {
    setForm((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (loading) return;

    setLoading(true);

    try {
      await notifications.promise(
        () => loginUser(form.email, form.password),
        {
          loading: {
            title: "Iniciando sesion...", 
            description: "Validando tus credenciales.",
          },
          success: {
            title: "Bienvenido",
            description: "Inicio de sesion exitoso.",
          },
          error: (err) =>
            isEmailNotConfirmedError(err)
              ? {
                  title: "Correo no confirmado",
                  description:
                    "Debes confirmar tu correo antes de iniciar sesion.",
                  button: {
                    title: "Ir a verificar",
                    onClick: () => {
                      const email = form.email.trim().toLowerCase();
                      sessionStorage.setItem("pending_verification_email", email);
                      navigate("/verify", {
                        state: { email, shouldResend: true },
                      });
                    },
                  },
                }
              : {
                  title: "Error iniciando sesion",
                  description: translateAuthError(err),
                },
        }
      );

      navigate("/admin", { replace: true });
    } catch (err) {
      // Toasts are handled by notifications.promise.
    } finally {
      setLoading(false);
    }
  };

  const goToVerifyEmail = () => {
    const email = form.email.trim().toLowerCase();
    if (!email) {
      notifications.warning({
        title: "Correo requerido",
        description: "Escribe tu correo para enviarte el codigo de verificacion.",
      });
      return;
    }

    sessionStorage.setItem("pending_verification_email", email);
    navigate("/verify", { state: { email, shouldResend: true } });
  };

  return {
    loading,
    handleChange,
    handleLogin,
    goToVerifyEmail,
  };
};

export default useLogin;
