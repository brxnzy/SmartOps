import { useEffect } from "react";
import landingImg from "../assets/landin2.svg";
import logoImg from "../assets/SmartOps.png";

const Landing: React.FC = () => {
  // Bloquear scroll del body
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "auto";
    };
  }, []);

  return (
    <header className="h-screen overflow-hidden bg-white white:bg-gray-900">
      {/* NAVBAR SOLO LOGO */}
      <nav className="bg-white white:bg-gray-900">
        <div className="container px-6 py-4 mx-auto flex items-center justify-between">
          {/* LOGO + TITULO */}
          <div className="flex items-center space-x-1">
            <img className="w-auto h-30 sm:h-15" src={logoImg} alt="Logo" />
            <h1 className="text-xl font-bold">
              <span style={{ color: "#3F3D56" }}>Smart</span>
              <span className="text-blue-500">Ops</span>
            </h1>
          </div>

          {/* BOTON */}
          <button
            className="px-5 py-2 text-sm tracking-wider text-white uppercase
                 transition-colors duration-300 transform bg-blue-500 rounded-lg
                 hover:bg-blue-600 focus:outline-none"
          >
            Iniciar
          </button>
        </div>
      </nav>

      {/* HERO */}
      <div className="container px-6 h-[calc(100vh-80px)] mx-auto flex items-center">
        <div className="items-center lg:flex w-full">
          {/* TEXTO */}
          <div className="w-full lg:w-1/2">
            <div className="lg:max-w-lg">
              <h1 className="text-4xl font-bold leading-tight text-[#3F3D56] lg:text-5xl">
                Todo tu negocio de domótica <span className="text-blue-500">bajo control</span>
              
              </h1>

              <p className="mt-4 text-lg text-gray-600">
               Simplifica la gestión de tus clientes y proyectos con herramientas que integran comunicación, planificación y seguimiento en una plataforma única.
              </p>
            </div>
          </div>

          {/* IMAGEN */}
          <div className="flex items-center justify-center w-full lg:w-1/2">
            <img
              className="w-full max-h-[80vh] object-contain"
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
