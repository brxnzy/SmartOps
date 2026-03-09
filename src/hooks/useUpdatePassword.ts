import { useContext, useEffect, useState } from "react";
import type { FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import AuthContext from "../context/AuthContext";
import { supabase } from "../libs/supabase";
import { updatePassword } from "../services/auth.service";

const useUpdatePassword = () => {
  const { authUser } = useContext(AuthContext)!;
  const navigate = useNavigate();

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [checkingAccess, setCheckingAccess] = useState(true);
  const [hasPasswordAccess, setHasPasswordAccess] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const bootstrapSessionFromLink = async () => {
      try {
        const searchParams = new URLSearchParams(window.location.search);
        const tokenHash = searchParams.get("token_hash");
        const linkType = searchParams.get("type");

        if (tokenHash && (linkType === "invite" || linkType === "recovery")) {
          const { error } = await supabase.auth.verifyOtp({
            token_hash: tokenHash,
            type: linkType,
          });
          if (error) throw error;

          window.history.replaceState({}, document.title, window.location.pathname);
        } else {
          const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
          const accessToken = hashParams.get("access_token");
          const refreshToken = hashParams.get("refresh_token");

          if (accessToken && refreshToken) {
            const { error } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            });
            if (error) throw error;
            window.history.replaceState({}, document.title, window.location.pathname);
          }
        }

        const { data: sessionData, error: getSessionError } = await supabase.auth.getSession();
        if (getSessionError) throw getSessionError;
        setHasPasswordAccess(Boolean(sessionData.session));
      } catch (error) {
        setIsError(true);
        setMessage(error instanceof Error ? error.message : "No se pudo validar el enlace.");
        setHasPasswordAccess(false);
      } finally {
        if (!cancelled) setCheckingAccess(false);
      }
    };

    void bootstrapSessionFromLink();

    return () => {
      cancelled = true;
    };
  }, []);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!hasPasswordAccess && !authUser) {
      setIsError(true);
      setMessage("Enlace invalido o expirado. Solicita una nueva invitacion.");
      return;
    }

    if (password !== confirm) {
      setIsError(true);
      setMessage("Las contrasenas no coinciden");
      return;
    }

    try {
      setSubmitting(true);
      setIsError(false);
      setMessage(null);

      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) throw sessionError;
      if (!sessionData.session) {
        throw new Error("Tu enlace ya no es valido. Solicita una nueva invitacion.");
      }

      await updatePassword(password);
      await supabase.auth.signOut();

      setIsError(false);
      setMessage("Contrasena actualizada correctamente");

      setTimeout(() => navigate("/login", { replace: true }), 1200);
    } catch (error) {
      setIsError(true);
      if (error instanceof Error) setMessage(error.message);
    } finally {
      setSubmitting(false);
    }
  };

  return {
    checkingAccess,
    hasPasswordAccess,
    isError,
    submitting,
    password,
    message,
    confirm,
    handleSubmit,
    setConfirm,
    setIsError,
    setPassword,
  };
};

export default useUpdatePassword;
