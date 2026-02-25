import { useState } from "react";
import { supabase } from "../libs/supabase";
import {  useNavigate } from "react-router-dom";

const useLogin = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);

    const [form, setForm] = useState({
        email: "",
        password: "",
    });

    const handleChange = (key: string, value: string) => {
        setForm({ ...form, [key]: value });
    };

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        const { error } = await supabase.auth.signInWithPassword({
        email: form.email,
        password: form.password,
        });

        if (error) {
        alert(error.message);
        setLoading(false);
        return;
        }

        navigate("/dashboard");
    };

    return{
        loading,
        setLoading,
        handleChange,
        handleLogin,
    }

}

export default useLogin;