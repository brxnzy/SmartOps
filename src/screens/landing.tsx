import landingImg from "../assets/landing.svg";
import logoImg from "../assets/logo.png";
import { Link } from "react-router-dom";
import { CircleUserRound } from "lucide-react";
import useAuth from "../hooks/useAuth";

const Landing: React.FC = () => {
  const { authUser, userProfile } = useAuth();

  const isAuthenticated = Boolean(authUser);
  const userDisplayName = userProfile?.name ?? "Dashboard";

  return (
    <header className="min-h-screen overflow-x-hidden bg-white">
      <nav className="bg-white">
        <div className="container mx-auto flex items-center justify-between px-4 py-4 sm:px-6">
          <div className="flex items-center gap-1">
            <img className="h-10 w-auto sm:h-12" src={logoImg} alt="Logo" />
            <h1 className="text-xl font-bold sm:text-2xl">
              <span>Smart</span>
              <span className="text-blue-500">Ops</span>
            </h1>
          </div>

          <Link to={isAuthenticated ? "/admin" : "/register"}>
            <button
              className="inline-flex items-center gap-2 rounded-lg bg-blue-500 px-4 py-2 text-xs font-semibold tracking-wide text-white uppercase transition-colors duration-300 hover:bg-blue-600 focus:outline-none sm:px-5 sm:text-sm"
            >
              {isAuthenticated ? (
                <>
                  <CircleUserRound size={18} />
                  <span className="max-w-28 truncate normal-case sm:max-w-40">
                    {userDisplayName}
                  </span>
                </>
              ) : (
                "Iniciar"
              )}
            </button>
          </Link>
        </div>
      </nav>

      <div className="container mx-auto px-4 pb-10 pt-4 sm:px-6 sm:pb-14 sm:pt-8">
        <div className="flex w-full flex-col-reverse items-center gap-8 lg:flex-row lg:gap-10">
          <div className="w-full lg:w-1/2">
            <div className="mx-auto max-w-xl text-center lg:mx-0 lg:text-left">
              <h1 className="text-3xl font-bold leading-tight sm:text-4xl lg:text-5xl">
                Todo tu negocio de domotica{" "}
                <span className="text-blue-500">bajo control</span>
              </h1>

              <p className="mt-4 text-base leading-relaxed text-gray-600 sm:text-lg">
                Simplifica la gestion de tus clientes y proyectos con
                herramientas que integran comunicacion, planificacion y
                seguimiento en una plataforma unica.
              </p>
            </div>
          </div>

          <div className="flex w-full items-center justify-center lg:w-1/2">
            <img
              className="h-auto w-full max-w-md object-contain sm:max-w-lg lg:max-w-xl"
              src={landingImg}
              alt="Smart Home Illustration"
            />
          </div>
        </div>
      </div>
    </header>
  );
};

export default Landing;
