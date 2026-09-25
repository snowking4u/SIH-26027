import { DepartmentWorkspace } from "@/components/departments/department-workspace";
import { ENGINEERING_GROUP, type DepartmentDefinition } from "@/hooks/useDepartmentData";

const DEFINITION: DepartmentDefinition = {
  key: "engineering",
  title: "Engineering Workspace",
  eyebrow: "Department · Track & Structures",
  description:
    "Track, bridges and level crossings. Engineering inspections and defects feed maintenance requirements that need traffic blocks for safe intervention.",
  assetTypes: ENGINEERING_GROUP,
};

export function EngineeringDepartmentPage() {
  return <DepartmentWorkspace definition={DEFINITION} />;
}