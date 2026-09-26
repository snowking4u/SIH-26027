import { useMemo, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  FilePlus2,
  Loader2,
  MapPin,
  ScrollText,
  Sparkles,
} from "lucide-react";

import { SectionHeader } from "@/components/common/page-header";
import { Button } from "@/components/ui/button";
import type { DepartmentDefinition } from "@/hooks/useDepartmentData";
import { apiErrorMessage } from "@/services/api/client";
import { submitDepartmentMaintenanceRequest } from "@/services/api/unified";
import type {
  Asset,
  DepartmentMaintenanceRequestResponse,
  Location,
  UnifiedDefect,
} from "@/services/api/types";

interface RequestFormProps {
  definition: DepartmentDefinition;
  assets: Asset[];
  locationById: Map<number, Location>;
  existingDefects: UnifiedDefect[];
  onSuccess?: (res: DepartmentMaintenanceRequestResponse) => void;
}

const PRESET_MAINTENANCE_TYPES: Record<string, string[]> = {
  tdms: [
    "Track Tamping & Lining",
    "Deep Ballast Screening",
    "Ultrasonic Rail Testing (USFD)",
    "Turnout & Point Renewal",
    "Rail Joint Thermite Welding",
    "Track Formation Rehabilitation",
    "Fishplate & Fastener Overhaul",
  ],
  tms: [
    "Track Geometry Correction",
    "Track Inspection & OMS Recording",
    "Rail Profile Grinding",
    "Curve Realignment & De-stressing",
    "Level Crossing Surface Renewal",
    "Ballast Shoulder Regulation",
  ],
  smms: [
    "Point Machine Overhaul & Friction Clutch Test",
    "Track Circuit Shunt Sensitivity Calibration",
    "Electronic Interlocking (EI) Diagnostic Overhaul",
    "Axle Counter Wheel Sensor Tuning",
    "Signal Colour Light Unit Replacement",
    "Signalling Power Supply / Battery Bank Check",
    "OHE Height & Stagger Verification",
    "OHE Section Insulator Maintenance",
  ],
};

const DURATION_PRESETS = [60, 90, 120, 180, 240];

export function RequestForm({
  definition,
  assets,
  locationById,
  existingDefects,
  onSuccess,
}: RequestFormProps) {
  // Form State
  const [selectedAssetId, setSelectedAssetId] = useState<number | "">("");
  const [maintenanceType, setMaintenanceType] = useState<string>("");
  const [customType, setCustomType] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [durationMinutes, setDurationMinutes] = useState<number>(120);
  const [plannedDate, setPlannedDate] = useState<string>(
    new Date().toISOString().split("T")[0],
  );
  const [startTime, setStartTime] = useState<string>("13:00");
  const [endTime, setEndTime] = useState<string>("15:00");
  const [blockType, setBlockType] = useState<string>("TRAFFIC");
  const [trafficBlockRequired, setTrafficBlockRequired] = useState<boolean>(true);
  const [powerBlockRequired, setPowerBlockRequired] = useState<boolean>(false);

  // Defect Linkage State
  const [includeDefect, setIncludeDefect] = useState<boolean>(false);
  const [defectMode, setDefectMode] = useState<"link" | "new">("new");
  const [selectedDefectId, setSelectedDefectId] = useState<number | "">("");
  const [newDefectCode, setNewDefectCode] = useState<string>("");
  const [newDefectSeverity, setNewDefectSeverity] = useState<string>("HIGH");
  const [newDefectDescription, setNewDefectDescription] = useState<string>("");

  // Submission State
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<DepartmentMaintenanceRequestResponse | null>(null);

  // Selected Asset details
  const selectedAsset = useMemo(
    () => assets.find((a) => a.id === Number(selectedAssetId)),
    [assets, selectedAssetId],
  );

  const selectedLocation = useMemo(() => {
    if (!selectedAsset?.location_id) return null;
    return locationById.get(selectedAsset.location_id) || null;
  }, [selectedAsset, locationById]);

  // Defects available for selected asset
  const assetDefects = useMemo(() => {
    if (!selectedAssetId) return [];
    return existingDefects.filter((d) => d.asset_id === Number(selectedAssetId));
  }, [existingDefects, selectedAssetId]);

  const presetTypes =
    PRESET_MAINTENANCE_TYPES[definition.key] || PRESET_MAINTENANCE_TYPES.tdms;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!selectedAssetId) {
      setError("Please select a target railway asset.");
      return;
    }

    const effectiveType = maintenanceType === "OTHER" ? customType.trim() : maintenanceType;
    if (!effectiveType) {
      setError("Please select or specify a maintenance type.");
      return;
    }

    if (!description.trim()) {
      setError("Please enter a brief work description for the field engineers.");
      return;
    }

    if (!durationMinutes || durationMinutes <= 0) {
      setError("Estimated duration must be greater than 0 minutes.");
      return;
    }

    // Combine planned date with start and end times
    let earliestStart: string | undefined;
    let latestEnd: string | undefined;
    try {
      if (plannedDate && startTime) {
        earliestStart = new Date(`${plannedDate}T${startTime}:00`).toISOString();
      }
      if (plannedDate && endTime) {
        latestEnd = new Date(`${plannedDate}T${endTime}:00`).toISOString();
      }
    } catch {
      // fallback to dates
    }

    setSubmitting(true);

    try {
      const response = await submitDepartmentMaintenanceRequest({
        department_key: definition.key,
        asset_id: Number(selectedAssetId),
        maintenance_type: effectiveType,
        description: description.trim(),
        required_duration_minutes: Number(durationMinutes),
        planned_date: plannedDate,
        earliest_start: earliestStart,
        latest_end: latestEnd,
        traffic_block_required: trafficBlockRequired,
        power_block_required: powerBlockRequired,
        block_type: blockType,
        defect_id: includeDefect && defectMode === "link" && selectedDefectId ? Number(selectedDefectId) : null,
        new_defect_code: includeDefect && defectMode === "new" && newDefectCode ? newDefectCode.trim().toUpperCase() : null,
        new_defect_description: includeDefect && defectMode === "new" ? newDefectDescription.trim() || description.trim() : null,
        new_defect_severity: includeDefect && defectMode === "new" ? newDefectSeverity : "MEDIUM",
      });

      setResult(response);
      if (onSuccess) {
        onSuccess(response);
      }
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const handleReset = () => {
    setSelectedAssetId("");
    setMaintenanceType("");
    setCustomType("");
    setDescription("");
    setDurationMinutes(120);
    setResult(null);
    setError(null);
    setIncludeDefect(false);
    setNewDefectCode("");
  };

  return (
    <div className="rounded-lg border border-line bg-surface-white p-5 shadow-card">
      <SectionHeader
        icon={ScrollText}
        title="Raise a Maintenance & Block Requirement"
        description={`Submit a validated maintenance request for ${definition.title}. The request automatically generates a Block Requirement, Planning Task, matches available windows, and creates a proposed Block Plan for the Section Controller.`}
      />

      {/* Success Notification Banner */}
      {result ? (
        <div className="mt-5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-5 text-emerald-950">
          <div className="flex items-start gap-3">
            <span className="grid size-9 shrink-0 place-items-center rounded-full bg-emerald-600 text-white shadow-card">
              <CheckCircle2 className="size-5" />
            </span>
            <div className="space-y-2">
              <h4 className="text-base font-bold text-emerald-900">
                Request Persisted & Dispatched to Operations Control
              </h4>
              <p className="text-xs leading-relaxed text-emerald-800">
                {result.message}
              </p>

              <div className="grid grid-cols-2 gap-2 pt-2 sm:grid-cols-4">
                <div className="rounded-md border border-emerald-500/20 bg-white/70 p-2.5">
                  <span className="text-3xs uppercase tracking-wider text-emerald-700 font-semibold">Maintenance Req</span>
                  <p className="font-mono text-xs font-bold text-emerald-950">MR-{result.maintenance_requirement_id}</p>
                </div>
                <div className="rounded-md border border-emerald-500/20 bg-white/70 p-2.5">
                  <span className="text-3xs uppercase tracking-wider text-emerald-700 font-semibold">Block Req</span>
                  <p className="font-mono text-xs font-bold text-emerald-950">BR-{result.block_requirement_id}</p>
                </div>
                <div className="rounded-md border border-emerald-500/20 bg-white/70 p-2.5">
                  <span className="text-3xs uppercase tracking-wider text-emerald-700 font-semibold">Planning Task</span>
                  <p className="font-mono text-xs font-bold text-emerald-950">{result.planning_task_code}</p>
                </div>
                <div className="rounded-md border border-emerald-500/20 bg-white/70 p-2.5">
                  <span className="text-3xs uppercase tracking-wider text-emerald-700 font-semibold">Block Plan</span>
                  <p className="font-mono text-xs font-bold text-brand-700">
                    {result.plan_code || "Pending Schedule"}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 pt-3">
                <Button size="sm" onClick={handleReset}>
                  <FilePlus2 className="size-4 mr-1.5" />
                  Raise Another Request
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {!result ? (
        <form onSubmit={handleSubmit} className="mt-5 space-y-5">
          {error ? (
            <div className="flex items-center gap-2 rounded-md border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-xs font-medium text-rose-800">
              <AlertCircle className="size-4 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          ) : null}

          {/* 1. Target Asset Selection */}
          <div className="grid gap-3 rounded-lg border border-line-dark/40 bg-surface-muted/30 p-4">
            <label className="block">
              <span className="flex items-center justify-between text-xs font-bold text-ink">
                <span>
                  Select Target Railway Asset <span className="text-danger">*</span>
                </span>
                <span className="text-3xs font-normal text-ink-muted">
                  Filtered by {definition.title}
                </span>
              </span>
              <select
                value={selectedAssetId}
                onChange={(e) => setSelectedAssetId(e.target.value ? Number(e.target.value) : "")}
                required
                className="mt-1.5 w-full rounded-md border border-line-dark bg-surface-white px-3 py-2 text-sm text-ink focus:border-brand-500 focus:outline-none"
              >
                <option value="">-- Choose Railway Asset ({assets.length} available) --</option>
                {assets.map((asset) => {
                  const loc = locationById.get(asset.location_id ?? -1);
                  const locStr = loc
                    ? `${loc.station_code} · ${loc.line_code} (KM ${loc.km_start}–${loc.km_end})`
                    : "No station attached";
                  return (
                    <option key={asset.id} value={asset.id}>
                      {asset.asset_name} [{asset.asset_type}] — {locStr}
                    </option>
                  );
                })}
              </select>
            </label>

            {/* Location Feedback Strip */}
            {selectedLocation ? (
              <div className="flex flex-wrap items-center gap-2 rounded-md border border-brand-500/20 bg-brand-50/50 px-3 py-2 text-xs text-brand-900">
                <MapPin className="size-3.5 text-brand-600 shrink-0" />
                <span className="font-semibold">Location:</span>
                <span>Station: <strong className="font-mono">{selectedLocation.station_code}</strong></span>
                <span>·</span>
                <span>Line: <strong className="font-mono">{selectedLocation.line_code}</strong></span>
                <span>·</span>
                <span>Section: <strong>{selectedLocation.section_code}</strong></span>
                <span>·</span>
                <span>KM: <strong>{selectedLocation.km_start} – {selectedLocation.km_end}</strong></span>
              </div>
            ) : null}
          </div>

          {/* 2. Maintenance Details */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block">
                <span className="text-xs font-bold text-ink">
                  Maintenance Type <span className="text-danger">*</span>
                </span>
                <select
                  value={maintenanceType}
                  onChange={(e) => setMaintenanceType(e.target.value)}
                  required
                  className="mt-1.5 w-full rounded-md border border-line-dark bg-surface-white px-3 py-2 text-sm text-ink focus:border-brand-500 focus:outline-none"
                >
                  <option value="">-- Select Standard Activity --</option>
                  {presetTypes.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                  <option value="OTHER">-- Custom / Other Activity --</option>
                </select>
              </label>

              {maintenanceType === "OTHER" ? (
                <input
                  type="text"
                  placeholder="Specify custom maintenance activity"
                  value={customType}
                  onChange={(e) => setCustomType(e.target.value)}
                  required
                  className="mt-2 w-full rounded-md border border-line-dark bg-surface-white px-3 py-2 text-sm text-ink placeholder:text-ink-faint focus:border-brand-500 focus:outline-none"
                />
              ) : null}
            </div>

            <div>
              <label className="block">
                <span className="flex items-center justify-between text-xs font-bold text-ink">
                  <span>Required Duration (Minutes) <span className="text-danger">*</span></span>
                  <span className="text-3xs text-ink-muted">Quick presets below</span>
                </span>
                <input
                  type="number"
                  min={15}
                  max={720}
                  step={15}
                  value={durationMinutes}
                  onChange={(e) => setDurationMinutes(Number(e.target.value))}
                  required
                  className="mt-1.5 w-full rounded-md border border-line-dark bg-surface-white px-3 py-2 text-sm text-ink focus:border-brand-500 focus:outline-none"
                />
              </label>

              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {DURATION_PRESETS.map((mins) => (
                  <button
                    key={mins}
                    type="button"
                    onClick={() => setDurationMinutes(mins)}
                    className={`rounded px-2 py-0.5 text-2xs font-medium transition-colors ${
                      durationMinutes === mins
                        ? "bg-brand-600 text-white"
                        : "bg-surface-muted text-ink hover:bg-surface-muted/80 border border-line"
                    }`}
                  >
                    {mins}m
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* 3. Timing Bounds & Schedule */}
          <div className="grid gap-3 rounded-lg border border-line p-4 sm:grid-cols-3">
            <div>
              <label className="block">
                <span className="text-xs font-medium text-ink">
                  Planned Execution Date <span className="text-danger">*</span>
                </span>
                <input
                  type="date"
                  value={plannedDate}
                  onChange={(e) => setPlannedDate(e.target.value)}
                  required
                  className="mt-1.5 w-full rounded-md border border-line-dark bg-surface-white px-3 py-1.5 text-sm text-ink focus:border-brand-500 focus:outline-none"
                />
              </label>
            </div>

            <div>
              <label className="block">
                <span className="text-xs font-medium text-ink">Preferred Earliest Start</span>
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="mt-1.5 w-full rounded-md border border-line-dark bg-surface-white px-3 py-1.5 text-sm text-ink focus:border-brand-500 focus:outline-none"
                />
              </label>
            </div>

            <div>
              <label className="block">
                <span className="text-xs font-medium text-ink">Preferred Latest End</span>
                <input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="mt-1.5 w-full rounded-md border border-line-dark bg-surface-white px-3 py-1.5 text-sm text-ink focus:border-brand-500 focus:outline-none"
                />
              </label>
            </div>
          </div>

          {/* 4. Block Flags */}
          <div className="grid gap-3 rounded-lg border border-line p-4 sm:grid-cols-3">
            <div>
              <label className="block">
                <span className="text-xs font-medium text-ink">Block Type</span>
                <select
                  value={blockType}
                  onChange={(e) => setBlockType(e.target.value)}
                  className="mt-1.5 w-full rounded-md border border-line-dark bg-surface-white px-3 py-1.5 text-sm text-ink focus:border-brand-500 focus:outline-none"
                >
                  <option value="TRAFFIC">Traffic Block (Track Possession)</option>
                  <option value="POWER">Power Block (OHE De-energised)</option>
                  <option value="INTEGRATED_BLOCK">Integrated (Traffic + Power Block)</option>
                </select>
              </label>
            </div>

            <div className="flex items-center pt-5">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={trafficBlockRequired}
                  onChange={(e) => setTrafficBlockRequired(e.target.checked)}
                  className="size-4 rounded accent-brand-600"
                />
                <span className="text-xs font-medium text-ink">Traffic Block Required</span>
              </label>
            </div>

            <div className="flex items-center pt-5">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={powerBlockRequired}
                  onChange={(e) => setPowerBlockRequired(e.target.checked)}
                  className="size-4 rounded accent-brand-600"
                />
                <span className="text-xs font-medium text-ink">Power Block (OHE) Required</span>
              </label>
            </div>
          </div>

          {/* 5. Defect Linkage Accordion */}
          <div className="rounded-lg border border-dashed border-line-dark p-4">
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={includeDefect}
                  onChange={(e) => setIncludeDefect(e.target.checked)}
                  className="size-4 rounded accent-brand-600"
                />
                <span className="text-xs font-bold text-ink">
                  Attach or Record a Track / Signal Defect with this Request
                </span>
              </label>
              {includeDefect ? (
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setDefectMode("new")}
                    className={`rounded px-2 py-0.5 text-2xs font-semibold ${
                      defectMode === "new" ? "bg-brand-600 text-white" : "bg-surface-muted text-ink"
                    }`}
                  >
                    Log New Defect
                  </button>
                  <button
                    type="button"
                    onClick={() => setDefectMode("link")}
                    className={`rounded px-2 py-0.5 text-2xs font-semibold ${
                      defectMode === "link" ? "bg-brand-600 text-white" : "bg-surface-muted text-ink"
                    }`}
                  >
                    Link Existing ({assetDefects.length})
                  </button>
                </div>
              ) : null}
            </div>

            {includeDefect && defectMode === "new" ? (
              <div className="mt-3 grid gap-3 pt-3 border-t border-line sm:grid-cols-3">
                <div>
                  <label className="block">
                    <span className="text-2xs font-semibold text-ink">Defect Code</span>
                    <input
                      type="text"
                      placeholder="e.g. USFD-RAIL-049"
                      value={newDefectCode}
                      onChange={(e) => setNewDefectCode(e.target.value)}
                      className="mt-1 w-full rounded-md border border-line-dark bg-surface-white px-3 py-1.5 text-xs text-ink focus:border-brand-500 focus:outline-none"
                    />
                  </label>
                </div>
                <div>
                  <label className="block">
                    <span className="text-2xs font-semibold text-ink">Severity</span>
                    <select
                      value={newDefectSeverity}
                      onChange={(e) => setNewDefectSeverity(e.target.value)}
                      className="mt-1 w-full rounded-md border border-line-dark bg-surface-white px-3 py-1.5 text-xs text-ink focus:border-brand-500 focus:outline-none"
                    >
                      <option value="CRITICAL">CRITICAL</option>
                      <option value="HIGH">HIGH</option>
                      <option value="MEDIUM">MEDIUM</option>
                      <option value="LOW">LOW</option>
                    </select>
                  </label>
                </div>
                <div>
                  <label className="block">
                    <span className="text-2xs font-semibold text-ink">Defect Summary</span>
                    <input
                      type="text"
                      placeholder="e.g. Transverse fissure detected"
                      value={newDefectDescription}
                      onChange={(e) => setNewDefectDescription(e.target.value)}
                      className="mt-1 w-full rounded-md border border-line-dark bg-surface-white px-3 py-1.5 text-xs text-ink focus:border-brand-500 focus:outline-none"
                    />
                  </label>
                </div>
              </div>
            ) : null}

            {includeDefect && defectMode === "link" ? (
              <div className="mt-3 pt-3 border-t border-line">
                <label className="block">
                  <span className="text-2xs font-semibold text-ink">Select Existing Defect</span>
                  <select
                    value={selectedDefectId}
                    onChange={(e) => setSelectedDefectId(e.target.value ? Number(e.target.value) : "")}
                    className="mt-1 w-full rounded-md border border-line-dark bg-surface-white px-3 py-1.5 text-xs text-ink focus:border-brand-500 focus:outline-none"
                  >
                    <option value="">-- Choose recorded defect --</option>
                    {assetDefects.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.defect_code || "DEFECT"} — {d.severity} ({d.status}): {d.defect_description}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            ) : null}
          </div>

          {/* 6. Work Description */}
          <div>
            <label className="block">
              <span className="text-xs font-bold text-ink">
                Work Description & Engineering Instructions <span className="text-danger">*</span>
              </span>
              <textarea
                rows={3}
                required
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Specify precise scope of maintenance, machinery required (e.g. BCM, Duomatic tamper, tower wagon), track safety measures, and speed restrictions required upon completion."
                className="mt-1.5 w-full resize-none rounded-md border border-line-dark bg-surface-white px-3 py-2 text-sm text-ink placeholder:text-ink-faint focus:border-brand-500 focus:outline-none"
              />
            </label>
          </div>

          {/* Controller Interconnection Notice */}
          <div className="rounded-lg border border-brand-500/20 bg-brand-50/40 p-3 text-xs text-brand-900 leading-relaxed flex items-start gap-2.5">
            <Sparkles className="size-4 text-brand-600 shrink-0 mt-0.5" />
            <span>
              <strong>Interconnected Operational Workflow:</strong> Submitting this request persists it to the
              official database, links the master asset, creates the Block Requirement &amp; Planning Task, matches
              feasible Available Windows at this station, and generates a proposed Block Plan immediately accessible
              to the Section Controller for review.
            </span>
          </div>

          {/* Submit Button */}
          <Button
            type="submit"
            disabled={submitting}
            className="w-full h-11 text-sm font-semibold shadow-card"
          >
            {submitting ? (
              <>
                <Loader2 className="size-4 mr-2 animate-spin" />
                Validating &amp; Creating Block Proposal...
              </>
            ) : (
              <>
                <ScrollText className="size-4 mr-2" />
                Submit Maintenance &amp; Block Request to Controller
              </>
            )}
          </Button>
        </form>
      ) : null}
    </div>
  );
}
