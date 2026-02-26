import logoImg from "../../assets/logo.png";
import Button from "../../components/Button";
import Input from "../../components/Input";
import useUpdatePassword from "../../hooks/useUpdatePassword";

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

  const lockIcon = (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
        d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"
      />
    </svg>
  );

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">

      {/* Logo top left */}
      <div className="absolute top-6 left-6 flex items-center gap-2.5">
        <img src={logoImg} alt="Logo" className="w-14 h-14 object-contain" />
        <span className="text-2xl font-semibold tracking-tight">
          <span className="text-gray-900">Smart</span>
          <span className="text-blue-500">Ops</span>
        </span>
      </div>

      <div className="relative w-full max-w-md">
        <div className="bg-white border border-gray-200 rounded-2xl p-8 shadow-sm">

          {/* Icon */}
          <div className="flex justify-center mb-6">
            <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
              <svg className="w-6 h-6 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z"
                />
              </svg>
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
                icon={lockIcon}
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
                icon={lockIcon}
              />
            </div>

            <Button
              type="submit"
              disabled={submitting}
              fullWidth
              className="bg-blue-800 hover:bg-blue-700 border-blue-800"
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