import { useState } from "react";
import { Link } from "react-router-dom";
import { Mail, Lock, Eye, EyeOff } from "lucide-react";
import Input from "../../components/Input";
import Button from "../../components/Button";
import logo from "../../assets/logo.png";
import Field from "../../components/Field";
import useLogin from "../../hooks/useLogin";

const Login: React.FC = () => {
  const { loading, handleLogin, handleChange } = useLogin();
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-gray-50">
      <div className="w-full max-w-xl">
        <div className="bg-white border border-gray-200 shadow-md rounded-2xl p-8">
          <div className="flex justify-center">
            <img src={logo} alt="Logo" className="h-28 w-auto object-contain" />
          </div>

          <h1 className="text-4xl font-semibold text-center mb-6 text-gray-900 tracking-tight">
            Iniciar sesion
          </h1>

          <form className="space-y-5" onSubmit={handleLogin}>
            <Field label="Correo electronico">
              <Input
                placeholder="ana@empresa.com"
                type="email"
                icon={<Mail size={20} />}
                required
                onChange={(e) => handleChange("email", e.target.value)}
              />
            </Field>

            <Field label="Contrasena">
              <Input
                placeholder="Ingrese su contrasena"
                type={showPassword ? "text" : "password"}
                icon={<Lock size={20} />}
                required
                onChange={(e) => handleChange("password", e.target.value)}
                rightElement={
                  <button
                    type="button"
                    aria-label={
                      showPassword ? "Ocultar contrasena" : "Mostrar contrasena"
                    }
                    title={
                      showPassword ? "Ocultar contrasena" : "Mostrar contrasena"
                    }
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="p-2 text-gray-500 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-400 rounded-md"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                }
              />
            </Field>

            <div className="flex justify-end">
              <Link
                to="/forgot-password"
                className="text-sm text-blue-600 hover:underline"
              >
                Olvidaste tu contraseña?
              </Link>
            </div>


            <Button
              type="submit"
              fullWidth
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700 text-white mt-2"
            >
              Iniciar sesion
            </Button>
          </form>

          <div className="my-6 border-t border-gray-100" />

          <div className="text-center">
            <p className="text-md text-gray-500">
              No tienes cuenta?{" "}
              <Link to="/register" className="text-blue-600 hover:underline">
                Registrate
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
