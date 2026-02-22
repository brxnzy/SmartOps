import {
  User,
  Mail,
  Lock,
  Building2,
  MapPin,
  Phone,
} from "lucide-react";
import Input from "../../components/Input";
import Button from "../../components/Button";
import FileInput from "../../components/FileInput";
import logo from "../../assets/logo.png";

// Field wrapper
const Field: React.FC<{ label: string; children: React.ReactNode }> = ({
  label,
  children,
}) => (
  <div className="flex flex-col gap-1.5">
    <label className="text-sm font-medium text-gray-500 tracking-wide">
      {label}
    </label>
    {children}
  </div>
);

// Register
const Register: React.FC = () => {
  return (
    <div className="min-h-screen  flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-3xl ">
        {/* Logo */}
        <div className="flex justify-center ">
          <img src={logo} alt="Logo" className="h-24 w-auto object-contain" />
        </div>

        {/* Header */}
        <div className="mb-4 text-center">
          <h1 className="text-3xl font-semibold text-gray-900 tracking-tight">
            Crea tu cuenta
          </h1>
        </div>

        {/* Card */}
        <div className="bg-gray-50 border border-gray-300 shadow-sm rounded-2xl p-6 sm:p-8">
          <form className="space-y-6" onSubmit={(e) => e.preventDefault()}>
            {/* Sección personal */}
            <section>
              <p className="text-sm font-semibold text-blue-600 uppercase tracking-wide mb-4">
                Datos personales
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Nombre completo">
                  <Input placeholder="Ana García" icon={<User size={21} />} required />
                </Field>
                <Field label="Correo electrónico">
                  <Input
                    type="email"
                    placeholder="ana@empresa.com"
                    icon={<Mail size={21} />}
                    required
                  />
                </Field>
                <Field label="Contraseña">
                  <Input
                    type="password"
                    placeholder="Mínimo 8 caracteres"
                    icon={<Lock size={21} />}
                    required
                  />
                </Field>
              </div>
            </section>

            <hr className="border-gray-100" />

            {/* Sección empresa */}
            <section>
              <p className="text-sm font-semibold text-blue-600 uppercase tracking-wide mb-4">
                Tu empresa
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <Field label="Nombre">
                  <Input
                    placeholder="Smart Home S.A."
                    icon={<Building2 size={21} />}
                    required
                  />
                </Field>
                <Field label="Dirección">
                  <Input
                    placeholder="Av. Principal 123"
                    icon={<MapPin size={21} />}
                    required
                  />
                </Field>
                <Field label="Teléfono">
                  <Input
                    type="tel"
                    placeholder="+1 809 000 0000"
                    icon={<Phone size={21} />}
                    required
                  />
                </Field>
              </div>

              {/* Logo upload */}
              <div className="mt-4">
                <Field label="Logotipo">
                  <FileInput accept="image/*" />
                </Field>
              </div>
            </section>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-2">
              <p className="text-md text-gray-500">
                ¿Ya tienes cuenta?{" "}
                <a href="#" className="text-blue-700 font-medium hover:underline">
                  Inicia sesión
                </a>
              </p>
              <Button
                type="submit"
                fullWidth
                className="sm:w-auto bg-blue-600 hover:bg-blue-700 text-white"
              >
                Crear cuenta
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Register;
