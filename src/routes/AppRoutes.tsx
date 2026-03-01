import { Navigate, Route, Routes } from "react-router-dom";
import { PERMISSIONS } from "../constants/permissions";
import Sidebar from "../layouts/Sidebar";
import AdminDashboard from "../screens/admin/AdminDashboard";
import Customers from "../screens/admin/Customers";
import Forbidden from "../screens/errors/Forbidden";
import ForgotPassword from "../screens/auth/ForgotPassword";
import Login from "../screens/auth/Login";
import Register from "../screens/auth/Register";
import UpdatePassword from "../screens/auth/UpdatePassword";
import VerifyEmail from "../screens/auth/VerifyEmail";
import Landing from "../screens/landing";
import AdminDefaultRoute from "./AdminDefaultRoute";
import PermissionRoute from "./PermissionRoute";
import ProtectedRoute from "./ProtectedRoute";
import PublicRoute from "./PublicRoute";

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/update-password" element={<UpdatePassword />} />

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
        path="/admin"
        element={
          <ProtectedRoute>
            <Sidebar />
          </ProtectedRoute>
        }
      >
        <Route index element={<AdminDefaultRoute />} />
        <Route
          path="dashboard"
          element={
            <PermissionRoute permission={PERMISSIONS.dashboardRead}>
              <AdminDashboard />
            </PermissionRoute>
          }
        />

        <Route
          path="customers"
          element={
            <PermissionRoute permission={PERMISSIONS.customersRead}>
              <Customers />
            </PermissionRoute>
          }
        />
      </Route>

      <Route
        path="/403"
        element={
          <ProtectedRoute>
            <Forbidden />
          </ProtectedRoute>
        }
      />

      <Route path="/dashboard" element={<Navigate to="/admin/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
