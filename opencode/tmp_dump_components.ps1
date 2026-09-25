param()
$ErrorActionPreference = "Stop"
function EscS($s) {
  $sb = New-Object System.Text.StringBuilder
  foreach ($ch in $s.ToCharArray()) {
    $c = [int]$ch
    if ($c -ge 0x20 -and $c -le 0x7E) { [void]$sb.Append($ch) }
    else { [void]$sb.Append(("[U+{0:X4}]" -f $c)) }
  }
  return $sb.ToString()
}
function ResolveTypeName($schema) {
  if (-not $schema) { return "" }
  if ($schema.'$ref') { return (EscS (($schema.'$ref' -replace '^#/components/schemas/', ''))) }
  if ($schema.type) {
    $t = EscS $schema.type
    if ($schema.items) {
      if ($schema.items.'$ref') {
        $inner = EscS (($schema.items.'$ref' -replace '^#/components/schemas/', ''))
        return $t + "<" + $inner + ">"
      } else {
        return $t + "<" + (EscS $schema.items.type) + ">"
      }
    }
    return $t
  }
  if ($schema.anyOf) { return (EscS (($schema.anyOf | ForEach-Object { if ($_.'$ref') { ($_."$ref" -replace '^#/components/schemas/','') } else { $_.type } }) -join ' | ')) }
  return "?"
}
$o = Invoke-RestMethod -Uri "http://127.0.0.1:8011/openapi.json" -TimeoutSec 30
$C = $o.components.schemas
$want = @(
  'TMSInspectionResponse','TMSInspectionCreate','TMSInspectionRequest',
  'TMSMaintenanceResponse','TMSMaintenanceCreate','TMSDefectResponse','TMSDefectCreate',
  'SMMSInspectionResponse','SMMSInspectionCreate','SMMSInspectionRequestCreate','SMMSInspectionRequestResponse',
  'SMMSMaintenanceResponse','SMMSMaintenanceCreate','SMMSAlertResponse','SMMSAlertCreate',
  'BlockPlanResponse','BlockPlanCreate','BlockPlanTaskResponse','BlockPlanTaskCreate',
  'OptimizationInputResponse','OptimizationInputCreate','OptimizationOutputResponse','OptimizationOutputCreate',
  'OptimizationRunResponse','OptimizationRunCreate','PlanValidationResponse','PlanValidationCreate',
  'ControllerDecisionResponse','ControllerDecisionCreate',
  'CandidateCheckRequest','CandidateCheckResponse','CandidateGenerationSummary','CandidateWindowResponse',
  'BlockRequirementResponse','BlockRequirementCreate','UnifiedDefectResponse','UnifiedMaintenanceResponse'
)
"=== COMPONENT FIELD MAPS (ASCII-safe) ==="
foreach ($name in $want) {
  if ($C.PSObject.Properties.Name -contains $name) {
    $s = $C.$name
    "### " + (EscS $name)
    $props = $s.properties
    if ($props) {
      foreach ($pn in $props.PSObject.Properties.Name) {
        $pd = $props.$pn
        $req = ""
        if ($s.required -and ($s.required -contains $pn)) { $req = " (req)" }
        "  " + (EscS $pn) + ": " + (ResolveTypeName $pd) + $req
      }
    } else {
      "  (no properties)"
    }
  } else {
    "### " + (EscS $name) + "  -- NOT FOUND"
  }
}
"=== smms + optimization special paths ==="
$paths = $o.paths
foreach ($p in @('/api/smms/inspections/requests','/api/optimization/plans/{plan_id}/validate','/api/candidates/check','/api/candidates/generate')) {
  if ($paths.PSObject.Properties.Name -contains $p) {
    $op = $paths.$p
    $names = @()
    foreach ($m in $op.PSObject.Properties.Name) { $names += $m }
    "PATH " + (EscS $p) + " ops=" + (EscS ($names -join ','))
  } else {
    "PATH " + (EscS $p) + " NOT-FOUND"
  }
}
