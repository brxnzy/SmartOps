import { Routes, Route } from "react-router-dom";
import Login from "../screens/auth/Login";
import Landing from "../screens/landing";
import Register from "../screens/auth/Register";
import VerifyEmail from "../screens/auth/VerifyEmail";
import PublicRoute from "./PublicRoute";
import Dashboard from "../screens/Dashboard/Dashboard";
import ProtectedRoute from "./ProtectedRoute";
import SileoTest from "../screens/SileoTest";

/**
 * En esta pantalla se trabaja de la siguiente manera:
 *
 * PublicRoute::: Cualquier persona puede acceder aun sin estar logueado
 *
 * ----Para poder usarlo simplemente en route dentro de element envolverlo como PublicRoute
 * ----Y paserle como children el elemento que deseamos ponerlo en publico
 *
 * ProtectRoute::: Solo podran acceder las personas que se encuentra logueada
 *
 * sin intentar acceder a una de esta ruta no podran entrar y lo envia al login en auto
 * Para poder Usarla es de la siguente manera Waaa very easier eeh
 *
 * ----Dentro de routes pasarle la ruta que estara protegida
 * ----Envolve el elemento dentro de ProctedRouter
 */

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />

      {/* Rutas públicas controladas */}
      <Route
        path="/login"
        element={
          <PublicRoute>
            <Login />
          </PublicRoute>
        }
      />

      <Route
        path="/register"
        element={
          <PublicRoute>
            <Register />
          </PublicRoute>
        }
      />

      <Route
        path="/verify"
        element={
          <PublicRoute>
            <VerifyEmail />
          </PublicRoute>
        }
      />

      <Route
        path="/sileo"
        element={
          <PublicRoute>
            <SileoTest />
          </PublicRoute>
        }
      />

      {/* Ruta protegida */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}
