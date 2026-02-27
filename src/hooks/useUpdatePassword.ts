import { useState, useContext, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import AuthContext from "../context/AuthContext";
import { updatePassword } from "../services/auth.service";

const useUpdatePassword = () => {
    const { authUser, loading } = useContext(AuthContext)!;
    const navigate = useNavigate();

    const [password, setPassword] = useState("");
    const [confirm, setConfirm] = useState("");
    const [message, setMessage] = useState<string | null>(null);
    const [isError, setIsError] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (!loading && !authUser) {
            navigate("/login");
        }
    }, [authUser, loading, navigate]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (password !== confirm) {
            setIsError(true);
            return setMessage("Las contraseñas no coinciden");
        }

        try {
            setSubmitting(true);
            setIsError(false);
            setMessage(null);

            await updatePassword(password);

            setIsError(false);
            setMessage("Contraseña actualizada correctamente");

            setTimeout(() => navigate("/login"), 1500);
        } catch (error) {
            setIsError(true);
            if (error instanceof Error) setMessage(error.message);
        } finally {
            setSubmitting(false);
        }
    };

    // if (loading) return null;


    return {
        isError,
        submitting,
        password,
        message,
        confirm,
        handleSubmit,
        setConfirm,
        setIsError,
        setPassword,
    }
}

export default useUpdatePassword;
