
import { Link } from "react-router-dom";
import { MailCheck } from "lucide-react";
import Button from "../../components/Button";
import Input from "../../components/Input";
import Field from "../../components/Field";
import useVerifyEmail from "../../hooks/useVerifyEmail";




export default function VerifyEmail() {
  const {
    email,
    token,
    canSubmit,
    cooldown,
    isResending,
    handleResend,
    handleVerify,
    handleTokenChange,
  } = useVerifyEmail()


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
