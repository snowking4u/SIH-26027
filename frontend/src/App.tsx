import { lazy } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";

import { RoleGuard } from "@/components/auth/role-guard";
import { AuthProvider } from "@/context/auth-context";
import { AppLayout } from "@/layouts/app-layout";

const LoginPage = lazy(() =>
  import("@/pages/login/login-page").then((module) => ({ default: module.LoginPage })),
);
const DashboardPage = lazy(() =>
  import("@/pages/dashboard/dashboard-page").then((module) => ({ default: module.DashboardPage })),
);
const LiveMapPage = lazy(() =>
  import("@/pages/live-map/live-map-page").then((module) => ({ default: module.LiveMapPage })),
);
const MaintenancePage = lazy(() =>
  import("@/pages/maintenance/maintenance-page").then((module) => ({ default: module.MaintenancePage })),
);
const BlockRequestsPage = lazy(() =>
  import("@/pages/block-requests/block-requests-page").then((module) => ({ default: module.BlockRequestsPage })),
);
const PlanningPage = lazy(() =>
  import("@/pages/planning/planning-page").then((module) => ({ default: module.PlanningPage })),
);
const CandidateWindowsPage = lazy(() =>
  import("@/pages/candidate-windows/candidate-windows-page").then((module) => ({ default: module.CandidateWindowsPage })),
);
const BlockPlansPage = lazy(() =>
  import("@/pages/block-plans/block-plans-page").then((module) => ({ default: module.BlockPlansPage })),
);
const TrainImpactPage = lazy(() =>
  import("@/pages/train-impact/train-impact-page").then((module) => ({ default: module.TrainImpactPage })),
);
const ControllerPage = lazy(() =>
  import("@/pages/controller/controller-page").then((module) => ({ default: module.ControllerPage })),
);
const DepartmentsPage = lazy(() =>
  import("@/pages/departments/departments-page").then((module) => ({ default: module.DepartmentsPage })),
);
const EngineeringDepartmentPage = lazy(() =>
  import("@/pages/departments/engineering-department-page").then((module) => ({ default: module.EngineeringDepartmentPage })),
);
const TractionDepartmentPage = lazy(() =>
  import("@/pages/departments/traction-department-page").then((module) => ({ default: module.TractionDepartmentPage })),
);
const SignallingDepartmentPage = lazy(() =>
  import("@/pages/departments/signalling-department-page").then((module) => ({ default: module.SignallingDepartmentPage })),
);
const ExecutionPage = lazy(() =>
  import("@/pages/execution/execution-page").then((module) => ({ default: module.ExecutionPage })),
);
const AuditPage = lazy(() =>
  import("@/pages/audit/audit-page").then((module) => ({ default: module.AuditPage })),
);
const SettingsPage = lazy(() =>
  import("@/pages/settings/settings-page").then((module) => ({ default: module.SettingsPage })),
);
const CoaPage = lazy(() =>
  import("@/pages/coa/coa-page").then((module) => ({ default: module.CoaPage })),
);
const TmsPage = lazy(() =>
  import("@/pages/tms/tms-page").then((module) => ({ default: module.TmsPage })),
);
const TdmsPage = lazy(() =>
  import("@/pages/tdms/tdms-page").then((module) => ({ default: module.TdmsPage })),
);
const SmmsPage = lazy(() =>
  import("@/pages/smms/smms-page").then((module) => ({ default: module.SmmsPage })),
);
const UnifiedPage = lazy(() =>
  import("@/pages/unified/unified-page").then((module) => ({ default: module.UnifiedPage })),
);
const NotFoundPage = lazy(() =>
  import("@/pages/not-found/not-found-page").then((module) => ({ default: module.NotFoundPage })),
);

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/controller" element={<ControllerPage />} />
          <Route path="/live-map" element={<LiveMapPage />} />
          <Route path="/maintenance" element={<MaintenancePage />} />
          <Route path="/block-requests" element={<BlockRequestsPage />} />
          <Route path="/planning" element={<PlanningPage />} />
          <Route path="/candidate-windows" element={<CandidateWindowsPage />} />
          <Route path="/block-plans" element={<BlockPlansPage />} />
          <Route path="/train-impact" element={<TrainImpactPage />} />
          <Route path="/departments" element={<DepartmentsPage />} />
          <Route path="/departments/engineering" element={<EngineeringDepartmentPage />} />
          <Route path="/departments/snt" element={<SignallingDepartmentPage />} />
          <Route path="/departments/traction" element={<TractionDepartmentPage />} />
          <Route path="/departments/traction-trd" element={<TractionDepartmentPage />} />
          <Route path="/execution" element={<ExecutionPage />} />
          <Route path="/audit" element={<AuditPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/coa" element={<CoaPage />} />
          <Route path="/tms" element={<TmsPage />} />
          <Route path="/tdms" element={<TdmsPage />} />
          <Route path="/smms" element={<SmmsPage />} />
          <Route path="/unified" element={<UnifiedPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
        <Route path="/index.html" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}