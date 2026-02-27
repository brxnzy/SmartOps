import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { MailCheck } from "lucide-react";
import Button from "../../components/Button";
import Input from "../../components/Input";
import Field from "../../components/Field";
import { notifications } from "../../services/notification.service";
import { resendVerificationOtp, verifyEmailOtp } from "../../services/auth.service";
import { translateAuthError } from "../../utils/authErrorMessages";
import { supabase } from "../../libs/supabase";
import type { VerifyState } from "../../types/auth";



const STORAGE_KEY = "pending_verification_email";
const RESEND_COOLDOWN_SECONDS = 60;

export default function VerifyEmail() {
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
      // Toast handled by notifications.promise
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

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-gray-50">
      <div className="w-full max-w-md bg-white border border-gray-200 shadow-md rounded-2xl p-8">
        <h1 className="text-2xl text-center font-semibold text-gray-900">
          Verifica tu correo
        </h1>

        <p className="mt-3 text-gray-600 text-center">
          Ingresa el codigo de 6 digitos que enviamos a tu email.
        </p>

        {email ? (
          <p className="mt-2 text-center text-sm text-gray-500">
            Correo: <span className="font-medium text-gray-700">{email}</span>
          </p>
        ) : null}

        <form className="mt-6 space-y-4" onSubmit={handleVerify}>
          <Field label="Codigo de verificacion">
            <Input
              value={token}
              onChange={(e) => handleTokenChange(e.target.value)}
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder="000000"
              maxLength={6}
              icon={<MailCheck size={20} />}
              required
            />
          </Field>

          <Button
            type="submit"
            fullWidth
            disabled={!canSubmit}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            Confirmar correo
          </Button>
        </form>

        <div className="mt-4 flex flex-col gap-3">
          <Button
            type="button"
            fullWidth
            onClick={handleResend}
            disabled={cooldown > 0 || isResending || !email}
            className="bg-gray-100 hover:bg-gray-200 text-gray-700 border-gray-200"
          >
            {cooldown > 0 ? `Reenviar en ${cooldown}s` : "Reenviar codigo"}
          </Button>

          <Link to="/login">
            <Button fullWidth className="bg-white hover:bg-gray-50 text-gray-700 border-gray-300">
              Volver a iniciar sesion
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
