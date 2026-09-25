import { DepartmentWorkspace } from "@/components/departments/department-workspace";
import { SMMS_DEFINITION } from "@/hooks/useDepartmentData";

export function SmmsPage() {
  return <DepartmentWorkspace definition={SMMS_DEFINITION} />;
}