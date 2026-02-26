import { useState } from "react";
import { sendPasswordReset } from "../services/auth.service";


const useForgotPassword = () => {
    const [email, setEmail] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setLoading(true);
      setMessage(null);
      setIsError(false);

      await sendPasswordReset(email);

      setMessage("Revisa tu correo para restablecer tu contraseña.");
    } catch (error) {
      setIsError(true);
      if (error instanceof Error) {
        setMessage(error.message);
      }
    } finally {
      setLoading(false);
    }
  };

  return{
    message,
    email,
    isError,
    loading,
    handleSubmit,
    setEmail
  }
}

export default useForgotPassword;