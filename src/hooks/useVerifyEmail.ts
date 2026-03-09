import { useEffect, useMemo, useState, type FormEvent } from "react";
import { supabase } from "../libs/supabase";
import {  useLocation, useNavigate } from "react-router-dom";
import type { VerifyState } from "../types/auth";
import { notifications } from "../services/notification.service";
import { resendVerificationOtp, verifyEmailOtp } from "../services/auth.service";
import { translateAuthError } from "../utils/authErrorMessages";

const STORAGE_KEY = "pending_verification_email";
const RESEND_COOLDOWN_SECONDS = 60;

const useVerifyEmail = () => {
    const location = useLocation();
  const navigate = useNavigate();
  

  const state = (location.state as VerifyState | null) ?? null;

  const [email, setEmail] = useState("");
  const [token, setToken] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  const canSubmit = useMemo(
    () => email.length > 0 && /^\d{6}$/.test(token) && !isVerifying,
    [email, isVerifying, token]
  );

  useEffect(() => {
    const resolveEmail = async () => {
      const fromState = state?.email?.trim().toLowerCase() ?? "";
      const fromStorage = sessionStorage.getItem(STORAGE_KEY)?.trim().toLowerCase() ?? "";
      const resolved = fromState || fromStorage;

      const { data } = await supabase.auth.getSession();
      const user = data.session?.user;

      if (user?.email_confirmed_at) {
        navigate("/dashboard", { replace: true });
        return;
      }

      if (!resolved) {
        notifications.warning({
          title: "Acceso no permitido",
          description: "Primero inicia registro o login para verificar tu correo.",
        });
        navigate("/login", { replace: true });
        return;
      }

      setEmail(resolved);
      sessionStorage.setItem(STORAGE_KEY, resolved);
    };

    void resolveEmail();
  }, [navigate, state?.email]);

  useEffect(() => {
    const shouldResend = Boolean(state?.shouldResend);
    if (!shouldResend || !email) return;

    const sendInitialOtp = async () => {
      try {
        setIsResending(true);
        await resendVerificationOtp(email);
        notifications.info({
          title: "Codigo enviado",
          description: "Revisa tu correo para completar la verificacion.",
        });
        setCooldown(RESEND_COOLDOWN_SECONDS);
      } catch (error) {
        notifications.error({
          title: "No se pudo enviar el codigo",
          description: translateAuthError(error),
        });
      } finally {
        setIsResending(false);
      }
    };

    void sendInitialOtp();
  }, [email, state?.shouldResend]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => clearInterval(timer);
  }, [cooldown]);

  const handleTokenChange = (value: string) => {
    const digitsOnly = value.replace(/\D/g, "").slice(0, 6);
    setToken(digitsOnly);
  };

  const handleVerify = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!canSubmit) return;

    try {
      setIsVerifying(true);
      await notifications.promise(() => verifyEmailOtp(email, token), {
        loading: {
          title: "Verificando codigo...",
          description: "Validando tu correo.",
        },
        success: {
          title: "Correo verificado",
          description: "Tu cuenta fue confirmada correctamente.",
        },
        error: (error) => ({
          title: "No se pudo verificar",
          description: translateAuthError(error, "Codigo invalido o expirado."),
        }),
      });

      sessionStorage.removeItem(STORAGE_KEY);

      const { data } = await supabase.auth.getSession();
      if (data.session) {
        navigate("/dashboard", { replace: true });
        return;
      }

      navigate("/login", { replace: true });
    } catch {
      console.log("Hubo un error")
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResend = async () => {
    if (!email || cooldown > 0 || isResending) return;

    try {
      setIsResending(true);
      await notifications.promise(() => resendVerificationOtp(email), {
        loading: {
          title: "Reenviando codigo...",
          description: "Te enviaremos un nuevo OTP por correo.",
        },
        success: {
          title: "Codigo reenviado",
          description: "Revisa tu bandeja de entrada y spam.",
        },
        error: (error) => ({
          title: "No se pudo reenviar",
          description: translateAuthError(error),
        }),
      });

      setCooldown(RESEND_COOLDOWN_SECONDS);
    } catch {
      // Toast handled by notifications.promise
    } finally {
      setIsResending(false);
    }
  };

  return{
    email,
    token,
    cooldown,
    isResending,
    canSubmit,
    handleResend,
    handleVerify,
    handleTokenChange,
  }
}

export default useVerifyEmail