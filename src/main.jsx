import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import Layout from "./components/Layout";
import Login from "./pages/Login";
import EmployeeDashboard from "./pages/EmployeeDashboard";
import NewTicket from "./pages/NewTicket";
import TicketDetail from "./pages/TicketDetail";
import Notifications from "./pages/Notifications";
import HRInbox from "./pages/HRInbox";
import HRDashboard from "./pages/HRDashboard";
import HomeDashboard from "./pages/HomeDashboard";
import AdminOverview from "./admin/AdminOverview";
import AdminWorktable from "./admin/AdminWorktable";
import AdminAgentDrilldown from "./admin/AdminAgentDrilldown";
import AdminAccounts from "./admin/AdminAccounts";
import AdminKb from "./admin/AdminKb";
import KbSearch from "./pages/KbSearch";
import KbViewer from "./pages/KbViewer";
import "./index.css";

function RequireAuth({ role, children }) {
  const { user } = useAuth();
  const location = useLocation();
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />;
  if (role && user.role !== role) {
    return (
      <Navigate
        to={user.role === "agent" ? "/inbox" : user.role === "admin" ? "/admin" : "/my-tickets"}
        replace
      />
    );
  }
  return children;
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            element={
              <RequireAuth>
                <Layout />
              </RequireAuth>
            }
          >
            <Route path="/dashboard" element={<HomeDashboard />} />
            <Route path="/kb" element={<KbSearch />} />
            <Route path="/kb/:slug" element={<KbViewer />} />
            <Route
              path="/my-tickets"
              element={
                <RequireAuth role="employee">
                  <EmployeeDashboard />
                </RequireAuth>
              }
            />
            <Route
              path="/new-ticket"
              element={
                <RequireAuth role="employee">
                  <NewTicket />
                </RequireAuth>
              }
            />
            <Route
              path="/drafts/:id/edit"
              element={
                <RequireAuth role="employee">
                  <NewTicket />
                </RequireAuth>
              }
            />
            <Route path="/tickets/:id" element={<TicketDetail />} />
            <Route path="/notifications" element={<Notifications />} />
            <Route
              path="/inbox"
              element={
                <RequireAuth role="agent">
                  <HRInbox />
                </RequireAuth>
              }
            />
            <Route
              path="/hr-dashboard"
              element={
                <RequireAuth role="agent">
                  <HRDashboard />
                </RequireAuth>
              }
            />
            {/* ---- admin console (3rd persona) ---- */}
            <Route
              path="/admin"
              element={
                <RequireAuth role="admin">
                  <AdminOverview />
                </RequireAuth>
              }
            />
            <Route
              path="/admin/worktable"
              element={
                <RequireAuth role="admin">
                  <AdminWorktable />
                </RequireAuth>
              }
            />
            <Route
              path="/admin/agents/:agentId"
              element={
                <RequireAuth role="admin">
                  <AdminAgentDrilldown />
                </RequireAuth>
              }
            />
            <Route
              path="/admin/accounts"
              element={
                <RequireAuth role="admin">
                  <AdminAccounts />
                </RequireAuth>
              }
            />
            <Route
              path="/admin/kb"
              element={
                <RequireAuth role="admin">
                  <AdminKb />
                </RequireAuth>
              }
            />
          </Route>
          <Route path="/" element={<RootRedirect />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

function RootRedirect() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  // The home dashboard is the shared landing page (role-aware nav boxes +
  // knowledge-base search): every signed-in role starts there.
  return <Navigate to="/dashboard" replace />;
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
