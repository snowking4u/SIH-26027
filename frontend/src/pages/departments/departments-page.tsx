import {
  ArrowRight,
  Cable,
  RadioTower,
  TramFront,
  type LucideIcon,
} from "lucide-react";
import { Link } from "react-router-dom";

import { PageHeader } from "@/components/common/page-header";
import { Badge } from "@/components/ui/badge";

interface Department {
  key: string;
  name: string;
  abbreviation: string;
  summary: string;
  assets: string;
  icon: LucideIcon;
  path: string;
  tone: string;
}

const DEPARTMENTS: Department[] = [
  {
    key: "engineering",
    name: "Engineering",
    abbreviation: "Engg.",
    summary: "Track and railway infrastructure maintenance — inspections, defects and track work.",
    assets: "Track · Bridges · Formation",
    icon: TramFront,
    path: "/departments/engineering",
    tone: "from-emerald-500/15 to-emerald-500/5 text-emerald-700",
  },
  {
    key: "traction",
    name: "Traction / TRD",
    abbreviation: "TRD",
    summary: "Traction distribution and overhead equipment (OHE) — power supply for traction loads.",
    assets: "OHE · Traction substations · Feeding posts",
    icon: Cable,
    path: "/departments/traction-trd",
    tone: "from-brand-500/15 to-brand-500/5 text-brand-700",
  },
  {
    key: "snt",
    name: "S&T / Signal",
    abbreviation: "S&T",
    summary: "Signalling and telecommunication systems — interlocking, signals, relay rooms.",
    assets: "Signals · Interlocking · Telecom",
    icon: RadioTower,
    path: "/departments/snt",
    tone: "from-ai/15 to-ai/5 text-ai",
  },
];

export function DepartmentsPage() {
  return (
    <div className="space-y-6 p-4 sm:p-6">
      <PageHeader
        eyebrow="Organisation · Departments"
        title="Departments"
        description="Maintenance departments whose work drives block requests. Select a department to see its scope and data sources."
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {DEPARTMENTS.map((department) => (
          <Link
            key={department.key}
            to={department.path}
            className="group flex flex-col rounded-lg border border-line bg-surface-white p-5 shadow-card transition-all hover:-translate-y-0.5 hover:border-navy-400 hover:shadow-panel"
          >
            <div className="flex items-center justify-between">
              <span className={`grid size-11 place-items-center rounded-lg bg-gradient-to-br [&_svg]:size-5 ${department.tone}`}>
                <department.icon aria-hidden="true" />
              </span>
              <Badge variant="outline">{department.abbreviation}</Badge>
            </div>
            <h2 className="mt-4 text-base font-semibold text-ink">{department.name}</h2>
            <p className="mt-1 flex-1 text-xs leading-relaxed text-ink-muted">{department.summary}</p>
            <p className="mt-3 text-2xs font-medium uppercase tracking-wider text-ink-faint">{department.assets}</p>
            <span className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-brand-700">
              Open department
              <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
            </span>
          </Link>
        ))}
      </div>

      <p className="max-w-2xl rounded-lg border border-dashed border-line-dark bg-surface-white px-4 py-3 text-xs leading-relaxed text-ink-muted">
        Department-to-source mapping shown here is the project scope for planning; live per-department
        maintenance queues load from real records in Phase 2.
      </p>
    </div>
  );
}