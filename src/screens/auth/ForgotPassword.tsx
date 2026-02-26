import { UserKey } from "lucide-react";
import Button from "../../components/Button";
import Input from "../../components/Input";
import useForgotPassword from "../../hooks/useForgotPassword";

export default function ForgotPassword() {
  
  const {
    email,
    loading,
    message,
    isError,
    setEmail,
    handleSubmit,
    } = useForgotPassword()

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">

      <div className="relative w-full max-w-md">
        {/* Card */}
        <div className="bg-white border border-gray-200 rounded-2xl p-8 shadow-sm">

          {/* Icon */}
          <div className="flex justify-center mb-6">
            <div className="w-15 h-15 rounded-xl bg-blue-100 flex items-center justify-center">
              <UserKey size={31} color="#2563EB"/>
            </div>
          </div>

          {/* Header */}
          <div className="text-center mb-7">
            <h2 className="text-xl font-semibold text-gray-800 tracking-tight">
              Recuperar contraseña
            </h2>
            <p className="mt-1.5 text-sm text-gray-500 leading-relaxed">
              Ingresa tu correo y te enviaremos un enlace para restablecerla.
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">
                Correo electrónico
              </label>
              <Input
                type="email"
                placeholder="tucorreo@ejemplo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                icon={
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                      d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75"
                    />
                  </svg>
                }
              />
            </div>

            <Button
              type="submit"
              disabled={loading}
              fullWidth
              className="bg-blue-600 hover:bg-blue-500 border-blue-600"
              icon={
                loading ? (
                  <svg className="animate-spin w-4 h-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                ) : undefined
              }
            >
              {loading ? "Enviando..." : "Enviar enlace de recuperación"}
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

          {/* Divider */}
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