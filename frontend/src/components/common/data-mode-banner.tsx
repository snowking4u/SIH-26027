import { ShieldCheck } from "lucide-react";

/**
 * Shared "Demo / Synthetic Data" banner. Operational records in this
 * workspace are synthetic/replay data; controller and planning actions are
 * still persisted to the real backend over the documented source chain.
 */
export function DataModeBanner() {
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-amber-600/40 bg-amber-600/[0.06] px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex items-start gap-3">
        <ShieldCheck className="mt-0.5 size-5 shrink-0 text-amber-600" aria-hidden="true" />
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-amber-700">Demo / Synthetic Data</p>
          <p className="mt-1 text-2xs leading-relaxed text-ink-muted">
            Operational records shown here are synthetic/replay data for demonstration. Decisions and revisions are
            persisted through the backend. This is <span className="font-semibold text-amber-700">not</span> live
            railway data and contains no real-time claims.
          </p>
        </div>
      </div>
      <div className="shrink-0 text-2xs lg:text-right">
        <span className="block text-ink-faint">Source chain</span>
        <span className="font-mono text-ink-muted">
          TMS / TDMS / SMMS / COA → Unified → Planning → Candidate → Block Plan → Validation → Controller
        </span>
      </div>
    </div>
  );
}