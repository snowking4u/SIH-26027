import { DepartmentWorkspace } from "@/components/departments/department-workspace";
import { SNT_GROUP, type DepartmentDefinition } from "@/hooks/useDepartmentData";

const DEFINITION: DepartmentDefinition = {
  key: "snt",
  title: "S&T Workspace",
  eyebrow: "Department · Signalling & Telecom",
  description:
    "Signals, track circuits and point machines. S&T failures and telecom alerts drive maintenance that needs isolation and traffic blocks.",
  assetTypes: SNT_GROUP,
};

export function SignallingDepartmentPage() {
  return <DepartmentWorkspace definition={DEFINITION} />;
}