import { useNavigate } from "react-router-dom";
import { supabase } from "../../libs/supabase";
import { useState } from "react";



// Ojo este archivo fue creado para ejemplo y poder cerrar session 
// Luego podemos modifcarla como queramos o eliminarla 

const Dashboard = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const handleLogout = async () => {
    try {
      setLoading(true);

      const { error } = await supabase.auth.signOut();

      if (error) {
        console.error(error.message);
        return;
      }

      navigate("/login", { replace: true });
    } catch (error: unknown) {
      if (error instanceof Error) {
        console.error(error.message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-6">
      <h1 className="text-2xl font-semibold">Codigo de ejemplo</h1>

      <button
        onClick={handleLogout}
        disabled={loading}
        className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
      >
        {loading ? "Cerrando sesión..." : "Cerrar sesión"}
      </button>
    </div>
  );
};

export default Dashboard;