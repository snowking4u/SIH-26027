import { DepartmentWorkspace } from "@/components/departments/department-workspace";
import { TRACTION_GROUP, type DepartmentDefinition } from "@/hooks/useDepartmentData";

const DEFINITION: DepartmentDefinition = {
  key: "traction",
  title: "Traction / TRD Workspace",
  eyebrow: "Department · Traction Distribution",
  description:
    "Overhead equipment (OHE) and traction distribution. Traction maintenance requires both power and traffic blocks to work safely on live territory.",
  assetTypes: TRACTION_GROUP,
};

export function TractionDepartmentPage() {
  return <DepartmentWorkspace definition={DEFINITION} />;
}