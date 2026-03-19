import { Navigate, Route, Routes } from "react-router-dom";
import { PERMISSIONS } from "../constants/permissions";
import AdminDashboard from "../screens/admin/AdminDashboard";
import Customers from "../screens/admin/Customers";
import DeviceInventory from "../screens/admin/DeviceInventory";
import Devices from "../screens/admin/Devices";
import Forbidden from "../screens/errors/Forbidden";
import ForgotPassword from "../screens/auth/ForgotPassword";
import Login from "../screens/auth/Login";
import Register from "../screens/auth/Register";
import UpdatePassword from "../screens/auth/UpdatePassword";
import VerifyEmail from "../screens/auth/VerifyEmail";
import Landing from "../screens/landing";
import AdminDefaultRoute from "./AdminDefaultRoute";
import AdminAreaRoute from "./AdminAreaRoute";
import AppEntryRoute from "./AppEntryRoute";
import CustomerAreaRoute from "./CustomerAreaRoute";
import CustomerDefaultRoute from "./CustomerDefaultRoute";
import PermissionRoute from "./PermissionRoute";
import ProtectedRoute from "./ProtectedRoute";
import PublicRoute from "./PublicRoute";
import Roles from "../screens/admin/Roles";
import SettingsProtocols from "../screens/admin/settings/SettingsProtocols";
import SettingsDeviceTypes from "../screens/admin/settings/SettingsDeviceTypes";
import SettingsTicketCategories from "../screens/admin/settings/SettingsTicketCategories";
import SettingsBrands from "../screens/admin/settings/SettingsBrands";
import SettingsLogs from "../screens/admin/settings/SettingsLogs";
import UsersAdmin from "../screens/admin/Users";
import CustomerProfile360 from "../screens/admin/CustomerProfile360";
import Account from "../screens/admin/Account";
import AdminTickets from "../screens/admin/Tickets";
import AdminTicketDetail from "../screens/admin/TicketDetail";
import CustomerTickets from "../screens/customer/CustomerTickets";
import CustomerTicketCreate from "../screens/customer/CustomerTicketCreate";
import CustomerTicketDetail from "../screens/customer/CustomerTicketDetail";
import CustomerProfile from "../screens/customer/CustomerProfile";


export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/update-password" element={<UpdatePassword />} />
      <Route
        path="/app"
        element={
          <ProtectedRoute>
            <AppEntryRoute />
          </ProtectedRoute>
        }
      />

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
            <AdminAreaRoute />
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

        <Route
          path="customers/:customerId/profile-360"
          element={
            <PermissionRoute permission={PERMISSIONS.customersRead}>
              <CustomerProfile360 />
            </PermissionRoute>
          }
        />
        <Route
          path="devices"
          element={
            <PermissionRoute permission={PERMISSIONS.devicesRead}>
              <Devices />
            </PermissionRoute>
          }
        />
        <Route
          path="inventory/devices"
          element={
            <PermissionRoute permission={PERMISSIONS.deviceInventoryRead}>
              <DeviceInventory />
            </PermissionRoute>
          }
        />

        <Route
          path="roles"
          element={
            <PermissionRoute permission={PERMISSIONS.rolesRead}>
              <Roles />
            </PermissionRoute>
          }
        />
        <Route
          path="users"
          element={
            <PermissionRoute permission={PERMISSIONS.usersRead}>
              <UsersAdmin />
            </PermissionRoute>
          }
        />

        <Route
          path="protocols"
          element={
            <PermissionRoute permission={PERMISSIONS.settingsProtocolsRead}>
              <SettingsProtocols />
            </PermissionRoute>
          }
        />

        <Route
          path="devices-types"
          element={
            <PermissionRoute permission={PERMISSIONS.settingsDeviceTypesRead}>
              <SettingsDeviceTypes />
            </PermissionRoute>
          }
        />
        <Route
          path="ticket-categories"
          element={
            <PermissionRoute permission={PERMISSIONS.settingsTicketCategoriesRead}>
              <SettingsTicketCategories />
            </PermissionRoute>
          }
        />
        <Route
          path="account"
          element={
            <PermissionRoute permission={PERMISSIONS.accountUpdate}>
              <Account />
            </PermissionRoute>
          }
        />

        <Route
          path="brands"
          element={
            <PermissionRoute permission={PERMISSIONS.settingsBrandsRead}>
              <SettingsBrands />
            </PermissionRoute>
          }
        />
        <Route
          path="logs"
          element={
            <PermissionRoute permission={PERMISSIONS.settingsLogsRead}>
              <SettingsLogs />
            </PermissionRoute>
          }
        />

        <Route
          path="tickets"
          element={
            <PermissionRoute permission={PERMISSIONS.ticketsRead}>
              <AdminTickets />
            </PermissionRoute>
          }
        />
        <Route
          path="tickets/:ticketId"
          element={
            <PermissionRoute permission={PERMISSIONS.ticketsRead}>
              <AdminTicketDetail />
            </PermissionRoute>
          }
        />
      </Route>

      <Route
        path="/customer"
        element={
          <ProtectedRoute>
            <CustomerAreaRoute />
          </ProtectedRoute>
        }
      >
        <Route index element={<CustomerDefaultRoute />} />
        <Route path="tickets" element={<CustomerTickets />} />
        <Route path="tickets/new" element={<CustomerTicketCreate />} />
        <Route path="tickets/:ticketId" element={<CustomerTicketDetail />} />
        <Route path="profile" element={<CustomerProfile />} />
      </Route>

      <Route
        path="/403"
        element={
          <ProtectedRoute>
            <Forbidden />
          </ProtectedRoute>
        }
      />

      <Route path="/dashboard" element={<Navigate to="/app" replace />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
