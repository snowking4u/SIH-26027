import { DepartmentWorkspace } from "@/components/departments/department-workspace";
import { TDMS_DEFINITION } from "@/hooks/useDepartmentData";

export function TdmsPage() {
  return <DepartmentWorkspace definition={TDMS_DEFINITION} />;
}