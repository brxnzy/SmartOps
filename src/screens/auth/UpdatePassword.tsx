import Button from "../../components/Button";
import Input from "../../components/Input";
import useUpdatePassword from "../../hooks/useUpdatePassword";
import { LockKeyhole, Lock } from "lucide-react";

export default function UpdatePassword() {
  const {
  password,
  confirm,
  submitting,
  message,
  isError,
  setPassword,
  setConfirm,
  handleSubmit,
  } = useUpdatePassword()


  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">

      {/* Logo top left */}
    

      <div className="relative w-full max-w-md">
        <div className="bg-white border border-gray-200 rounded-2xl p-8 shadow-sm">

          {/* Icon */}
          <div className="flex justify-center mb-6">
            <div className="w-14 h-14 rounded-xl bg-blue-100 flex items-center justify-center">
              <LockKeyhole size={30} color="#2563EB"/>
            </div>
          </div>

          {/* Header */}
          <div className="text-center mb-7">
            <h2 className="text-xl font-semibold text-gray-800 tracking-tight">
              Actualizar contraseña
            </h2>
            <p className="mt-1.5 text-sm text-gray-500 leading-relaxed">
              Elige una contraseña segura para proteger tu cuenta.
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">
                Nueva contraseña
              </label>
              <Input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                icon={<Lock size={21}/>}
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">
                Confirmar contraseña
              </label>
              <Input
                type="password"
                placeholder="••••••••"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
                icon={<Lock size={21}/>}
              />
            </div>

            <Button
              type="submit"
              disabled={submitting}
              fullWidth
              className="bg-blue-600 hover:bg-blue-500 border-blue-600"
              icon={
                submitting ? (
                  <svg className="animate-spin w-4 h-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                ) : undefined
              }
            >
              {submitting ? "Actualizando..." : "Actualizar contraseña"}
            </Button>

            {/* Message */}
            {message && (
              <div className={`flex items-start gap-2.5 p-3 rounded-lg text-sm border
                ${isError
                  ? "bg-red-50 border-red-200 text-red-600"
                  : "bg-green-50 border-green-200 text-green-700"
                }`}
              >
                <svg className="w-4 h-4 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  {isError ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
                    />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  )}
                </svg>
                {message}
              </div>
            )}
          </form>

          {/* Back link */}
          <div className="border-t border-gray-100 mt-6 pt-5 text-center">
            <a href="/login" className="text-xs text-gray-400 hover:text-gray-600 transition-colors duration-200 flex items-center justify-center gap-1">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
              </svg>
              Volver al inicio de sesión
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}