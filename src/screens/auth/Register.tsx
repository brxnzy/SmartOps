import {
  User,
  Mail,
  Lock,
  Building2,
  MapPin,
  Phone,
  IdCard,
  FileText,
} from "lucide-react";
import Input from "../../components/Input";
import Button from "../../components/Button";
import FileInput from "../../components/FileInput";
import logo from "../../assets/logo.png";
import { Link } from "react-router-dom";
import Field from "../../components/Field";

// Register
const Register: React.FC = () => {
  return (
    <div className="min-h-screen  flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-3xl ">
        {/* Logo */}

        {/* Card */}
        <div className="bg-gray-50 border border-gray-300 shadow-sm rounded-2xl p-6 sm:p-8">
        <div className="flex justify-center ">
          <img src={logo} alt="Logo" className="h-24 w-auto object-contain" />
        </div>

        {/* Header */}
        <div className="mb-4 text-center">
          <h1 className="text-3xl font-semibold text-gray-900 tracking-tight">
            Crea tu cuenta
          </h1>
        </div>
          <form className="space-y-3" onSubmit={(e) => e.preventDefault()}>
            {/* Sección personal */}
            <section>
              <p className="text-sm font-semibold text-blue-600 uppercase tracking-wide mb-2">
                Datos personales
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Nombre completo">
                  <Input
                    placeholder="Ana García"
                    icon={<User size={21} />}
                    required
                  />
                </Field>
                <Field label="Correo electrónico">
                  <Input
                    type="email"
                    placeholder="ana@empresa.com"
                    icon={<Mail size={21} />}
                    required
                  />
                </Field>
                <Field label="Cedula">
                  <Input
                    type="text"
                    pattern="\d{3}-\d{7}-\d{1}"
                    placeholder="001-1234567-8"
                    icon={<IdCard size={21} />}
                    inputMode="numeric"
                    maxLength={12}
                    onChange={(e) => {
                      let value = e.target.value.replace(/\D/g, "");
                      if (value.length > 3) {
                        value = value.slice(0, 3) + "-" + value.slice(3);
                      }
                      if (value.length > 11) {
                        value = value.slice(0, 11) + "-" + value.slice(11);
                      }
                      e.target.value = value;
                    }}
                    required
                  title="Formato: 001-1234567-8"

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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                  pattern="\d{3}-\d{3}-\d{4}"
                  placeholder="809-000-0000"
                  icon={<Phone size={21} />}
                  inputMode="numeric"
                  maxLength={12}
                  onChange={(e) => {
                    let value = e.target.value.replace(/\D/g, "");
                    if (value.length > 3) {
                    value = value.slice(0, 3) + "-" + value.slice(3);
                    }
                    if (value.length > 7) {
                    value = value.slice(0, 7) + "-" + value.slice(7);
                    }
                    e.target.value = value;
                  }}
                  required
                  title="Formato: 809-000-0000"
                  />
                </Field>
                <Field label="RNC">
                  <Input
                    type="tel"
                    placeholder=""
                    icon={<FileText size={21} />}
                    required
                    maxLength={12}
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
                <Link to="/login" className="text-blue-600 hover:underline">
                  Inicia sesión
                </Link>
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
