import { Routes, Route } from "react-router-dom";
import Login from "../screens/auth/Login";
import Landing from "../screens/Landing";
import Register from "../screens/auth/Register";
import VerifyEmail from "../screens/auth/VerifyEmail";
import PublicRoute from "./PublicRoute";
import Dashboard from "../screens/Dashboard/Dashboard";
import ProtectedRoute from "./ProtectedRoute";
import ForgotPassword from "../screens/auth/ForgotPassword";
import UpdatePassword from "../screens/auth/UpdatePassword";


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
      {/* Rutas públicas normales */}
      <Route
        path="/forgot-password"
        element={<ForgotPassword />}
      />

      <Route
        path="/update-password"
        element={<UpdatePassword />}
      />

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
