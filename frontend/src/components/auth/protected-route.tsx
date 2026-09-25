import { Navigate, Outlet, useLocation } from "react-router-dom";
import { getDashboardForRole, isRouteAllowed } from "@/config/roles";
import { useAuth } from "@/context/auth-context";

export function ProtectedRoute() {
  const { user, isAuthenticated } = useAuth();
  const location = useLocation();

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Check if current user is allowed on this specific route
  const allowed = isRouteAllowed(user.role, location.pathname);

  if (!allowed) {
    // If not allowed, redirect strictly to their authorized dashboard
    const fallbackDashboard = getDashboardForRole(user.role);
    return <Navigate to={fallbackDashboard} replace />;
  }

  return <Outlet />;
}
