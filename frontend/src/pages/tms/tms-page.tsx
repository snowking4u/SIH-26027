import { DepartmentWorkspace } from "@/components/departments/department-workspace";
import { TMS_DEFINITION } from "@/hooks/useDepartmentData";

export function TmsPage() {
  return <DepartmentWorkspace definition={TMS_DEFINITION} />;
}