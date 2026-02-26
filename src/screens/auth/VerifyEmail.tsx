import { Link, useLocation } from "react-router-dom";
import Button from "../../components/Button";

interface VerifyState {
  email?: string;
}

export default function VerifyEmail() {
  const location = useLocation();
  const state = (location.state as VerifyState | null) ?? null;

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-gray-50">
      <div className="w-full max-w-md bg-white border border-gray-200 shadow-md rounded-2xl p-8">
        <h1 className="text-2xl text-center font-semibold text-gray-900">
          Verifica tu correo
        </h1>

        <p className="mt-4 text-gray-600 text-center">
          Te enviamos un enlace de confirmacion para activar tu cuenta.
        </p>

        {state?.email ? (
          <p className="mt-2 text-center text-sm text-gray-500">
            Correo: <span className="font-medium text-gray-700">{state.email}</span>
          </p>
        ) : null}

        <div className="mt-6">
          <Link to="/login">
            <Button fullWidth className="bg-blue-600 hover:bg-blue-700 text-white">
              Volver a iniciar sesion
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
