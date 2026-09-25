import { Navigate, Outlet, useLocation } from "react-router-dom";
import { ShieldAlert } from "lucide-react";
import { getDashboardForRole, ROLE_CONFIGS, type UserRole } from "@/config/roles";
import { useAuth } from "@/context/auth-context";
import { Button } from "@/components/ui/button";

interface RoleGuardProps {
  allowedRoles: UserRole[];
}

export function RoleGuard({ allowedRoles }: RoleGuardProps) {
  const { user, isAuthenticated } = useAuth();
  const location = useLocation();

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  const isAllowed = allowedRoles.includes(user.role);

  if (!isAllowed) {
    const userRoleConfig = ROLE_CONFIGS[user.role] || ROLE_CONFIGS.controller;
    const userDashboard = getDashboardForRole(user.role);

    return (
      <div className="min-h-[70vh] flex items-center justify-center p-6">
        <div className="max-w-md w-full rounded-2xl border border-rose-500/30 bg-navy-900/90 p-8 text-center shadow-2xl backdrop-blur-xl">
          <div className="mx-auto grid size-16 place-items-center rounded-full bg-rose-500/10 border border-rose-500/30 text-rose-400 mb-4">
            <ShieldAlert className="size-8" />
          </div>
          <h2 className="text-xl font-bold text-white">403 — Access Restricted</h2>
          <p className="mt-2 text-sm text-navy-300 leading-relaxed">
            Your current account (<strong className="text-white">{userRoleConfig.name}</strong>) does not have authorization to view this departmental dashboard.
          </p>
          <div className="mt-6 pt-4 border-t border-navy-800">
            <Button
              className="w-full bg-brand-600 hover:bg-brand-500 text-white font-medium"
              onClick={() => {
                window.location.href = userDashboard;
              }}
            >
              Go to Your {userRoleConfig.badge} Dashboard
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return <Outlet />;
}
