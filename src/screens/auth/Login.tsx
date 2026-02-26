import { Link } from "react-router-dom";
import { Mail, Lock } from "lucide-react";
import Input from "../../components/Input";
import Button from "../../components/Button";
import logo from "../../assets/logo.png";
import Field from "../../components/Field";
import useLogin from "../../hooks/useLogin";

const Login: React.FC = () => {
  const { loading, handleLogin, handleChange } = useLogin();

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-gray-50">
      <div className="w-full max-w-md">
        <div className="bg-white border border-gray-200 shadow-md rounded-2xl p-8">
          <div className="flex justify-center">
            <img src={logo} alt="Logo" className="h-24 w-auto" />
          </div>

          <h1 className="text-2xl mb-6 text-center font-semibold text-gray-900">
            Iniciar sesion
          </h1>

          <form className="space-y-5" onSubmit={handleLogin}>
            <Field label="Correo electronico">
              <Input
                type="email"
                icon={<Mail size={20} />}
                required
                onChange={(e) => handleChange("email", e.target.value)}
              />
            </Field>

            <Field label="Contrasena">
              <Input
                type="password"
                icon={<Lock size={20} />}
                required
                onChange={(e) => handleChange("password", e.target.value)}
              />
            </Field>

            <div className="flex justify-end">
              <button
                type="button"
                disabled={loading}
                className="text-sm text-blue-600 hover:underline disabled:opacity-60 disabled:cursor-not-allowed"
              >
                Olvidaste tu contrasena?
              </button>
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
