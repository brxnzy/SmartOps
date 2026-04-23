import { Navigate, Route, Routes } from "react-router-dom";
import { PERMISSIONS } from "../constants/permissions";
import AdminDashboard from "../screens/admin/AdminDashboard";
import Customers from "../screens/admin/Customers";
import Devices from "../screens/admin/Devices";
import Suppliers from "../screens/admin/Suppliers";
import InventoryLoads from "../screens/admin/InventoryLoads";
import AutomationKits from "../screens/admin/AutomationKits";
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
import SettingsChecklistTemplates from "../screens/admin/settings/SettingsChecklistTemplates";
import SettingsPostInstallationChecks from "../screens/admin/settings/SettingsPostInstallationChecks";
import SettingsLogs from "../screens/admin/settings/SettingsLogs";
import EmailHistory from "../screens/admin/EmailHistory";
import UsersAdmin from "../screens/admin/Users";
import CustomerProfile360 from "../screens/admin/CustomerProfile360";
import Account from "../screens/admin/Account";
import Companies from "../screens/admin/Companies";
import VisitsCalendar from "../screens/admin/SiteSurvey";
import Schedule from "../screens/admin/Schedule";
import AdminTickets from "../screens/admin/Tickets";
import AdminTicketDetail from "../screens/admin/TicketDetail";
import BudgetList from "../screens/admin/BudgetList";
import BudgetDetail from "../screens/admin/BudgetDetail";
import InstallationProjects from "../screens/admin/InstallationProjects";
import InstallationProjectDetail from "../screens/admin/InstallationProjectDetail";
import CustomerTickets from "../screens/customer/CustomerTickets";
import CustomerTicketCreate from "../screens/customer/CustomerTicketCreate";
import CustomerTicketDetail from "../screens/customer/CustomerTicketDetail";
import CustomerProfile from "../screens/customer/CustomerProfile";
import CustomerQuotes from "../screens/customer/CustomerQuotes";
import CustomerQuoteDetail from "../screens/customer/CustomerQuoteDetail";
import CustomerNotifications from "../screens/customer/CustomerNotifications";
import CustomerPayments from "../screens/customer/CustomerPayments";
import CustomerPaymentDetail from "../screens/customer/CustomerPaymentDetail";
import DeliveryActPage from "../screens/DeliveryAct";
import SuperAdminAreaRoute from "./SuperAdminAreaRoute";
import SuperAdminDefaultRoute from "./SuperAdminDefaultRoute";
import SuperAdminDashboard from "../screens/superadmin/SuperAdminDashboard";
import SuperAdminCompanyDetail from "../screens/superadmin/SuperAdminCompanyDetail";
import AdminSupport from "../screens/admin/Support";
import SuperAdminSupport from "../screens/superadmin/SuperAdminSupport";
import SupportRequestDetail from "../screens/admin/SupportRequestDetail";
import SuperAdminSupportRequestDetail from "../screens/superadmin/SuperAdminSupportRequestDetail";
import Payments from "../screens/admin/Payments";


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
          path="suppliers"
          element={
            <PermissionRoute permission={PERMISSIONS.suppliersRead}>
              <Suppliers />
            </PermissionRoute>
          }
        />
        <Route
          path="inventory/loads"
          element={
            <PermissionRoute permission={PERMISSIONS.inventoryLoadsRead}>
              <InventoryLoads />
            </PermissionRoute>
          }
        />
        <Route
          path="inventory/kits"
          element={
            <PermissionRoute permission={PERMISSIONS.kitsRead}>
              <AutomationKits />
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
          path="companies"
          element={
            <PermissionRoute permission={PERMISSIONS.companiesRead}>
              <Companies />
            </PermissionRoute>
          }
        />

        <Route
          path="schedule"
          element={
            <PermissionRoute permission={PERMISSIONS.scheduleRead}>
              <Schedule />
            </PermissionRoute>
          }
        />
        <Route
          path="site_surveys"
          element={
            <PermissionRoute permission={PERMISSIONS.siteSurveyRead}>
              <VisitsCalendar />
            </PermissionRoute>
          }
        />
        <Route
          path="site_surveys/:surveyId"
          element={
            <PermissionRoute permission={PERMISSIONS.siteSurveyRead}>
              <VisitsCalendar />
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
          path="checklist-templates"
          element={
            <PermissionRoute permission={PERMISSIONS.settingsChecklistTemplatesRead}>
              <SettingsChecklistTemplates />
            </PermissionRoute>
          }
        />
        <Route
          path="post-installation-checks"
          element={
            <PermissionRoute permission={PERMISSIONS.settingsPostInstallationChecksRead}>
              <SettingsPostInstallationChecks />
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
          path="email-history"
          element={
            <PermissionRoute permission={PERMISSIONS.emailHistoryRead}>
              <EmailHistory />
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
        <Route
          path="budgets"
          element={
            <PermissionRoute permission={PERMISSIONS.budgetsRead}>
              <BudgetList />
            </PermissionRoute>
          }
        />
        <Route
          path="budgets/:budgetId"
          element={
            <PermissionRoute permission={PERMISSIONS.budgetsRead}>
              <BudgetDetail />
            </PermissionRoute>
          }
        />
        <Route
          path="installation-projects"
          element={
            <PermissionRoute permission={PERMISSIONS.installationProjectsRead}>
              <InstallationProjects />
            </PermissionRoute>
          }
        />
        <Route
          path="installation-projects/:projectId"
          element={
            <PermissionRoute permission={PERMISSIONS.installationProjectsOpen}>
              <InstallationProjectDetail />
            </PermissionRoute>
          }
        />
        <Route
          path="payments"
          element={
            <PermissionRoute permission={PERMISSIONS.paymentsRead}>
              <Payments />
            </PermissionRoute>
          }
        />

        <Route
          path="acta/:actId"
          element={
            <PermissionRoute permission={PERMISSIONS.installationProjectsOpen}>
              <DeliveryActPage />
            </PermissionRoute>
          }
        />

        <Route path="support" element={<AdminSupport />} />
        <Route path="support/:requestId" element={<SupportRequestDetail />} />
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
        <Route path="quotes" element={<CustomerQuotes />} />
        <Route path="quotes/:budgetId" element={<CustomerQuoteDetail />} />
        <Route path="payments" element={<CustomerPayments />} />
        <Route path="payments/:accountId" element={<CustomerPaymentDetail />} />
        <Route path="notifications" element={<CustomerNotifications />} />
        <Route path="profile" element={<CustomerProfile />} />
      </Route>

      <Route
        path="/superadmin"
        element={
          <ProtectedRoute>
            <SuperAdminAreaRoute />
          </ProtectedRoute>
        }
      >
        <Route index element={<SuperAdminDefaultRoute />} />
        <Route path="dashboard" element={<SuperAdminDashboard />} />
        <Route path="companies/:companyId" element={<SuperAdminCompanyDetail />} />
        <Route path="support" element={<SuperAdminSupport />} />
        <Route path="support/:requestId" element={<SuperAdminSupportRequestDetail />} />
      </Route>

      <Route
        path="/acta/:actId"
        element={
          <ProtectedRoute>
            <DeliveryActPage />
          </ProtectedRoute>
        }
      />

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
