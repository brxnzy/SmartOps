import { useState } from "react";
import { supabase } from "../libs/supabase";
import { useNavigate } from "react-router-dom";

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
      const { data, error } = await supabase.auth.signInWithPassword({
        email: form.email,
        password: form.password,
      });

      if (error) {
        throw error;
      }

      if (!data.user) {
        throw new Error("No se pudo iniciar sesión.");
      }
      
      navigate("/dashboard", { replace: true });

    } catch (err: unknown) {
    if (err instanceof Error) {
        alert(err.message);
    } else {
        alert("Ocurrió un error inesperado");
    }
    } finally {
        setLoading(false);
        }
    };

  return {
    loading,
    handleChange,
    handleLogin,
  };
};

export default useLogin;