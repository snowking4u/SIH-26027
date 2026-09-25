function EscS($s){ if($null -eq $s){ return "(null)" }; $sb=New-Object System.Text.StringBuilder; foreach($ch in $s.ToCharArray()){ $c=[int]$ch; if($c -ge 0x20 -and $c -le 0x7E){[void]$sb.Append($ch)}else{[void]$sb.Append(("[U+{0:X4}]" -f $c))} }; $sb.ToString() }
$o = Invoke-RestMethod -Uri "http://127.0.0.1:8011/openapi.json" -TimeoutSec 30
$C = $o.components.schemas
$targets = @(
  'SMMSInspectionCreate','SMMSMaintenanceCreate',
  'BlockPlanTaskResponse','BlockPlanTaskCreate',
  'ControllerDecisionResponse','ControllerDecisionCreate',
  'PlanValidationResponse','PlanValidationCreate',
  'OptimizationInputResponse','OptimizationInputCreate',
  'OptimizationOutputResponse','OptimizationOutputCreate',
  'OptimizationRunResponse','OptimizationRunCreate',
  'DefectFailureResponse','MaintenanceRequirementResponse',
  'BlockRequirementResponse','BlockRequirementCreate',
  'BlockPlanResponse','BlockPlanCreate',
  'CandidateCheckRequest','CandidateCheckResponse',
  'CandidateBlockWindowResponse','CandidateGenerationSummary'
)
foreach ($n in $targets) {
  "### " + (EscS $n)
  if (-not ($C.PSObject.Properties.Name -contains $n)) { "  NOT-IN-COMPONENTS"; continue }
  $s = $C.$n
  $req = @(); if ($s.required) { $req = @($s.required) }
  foreach ($pn in $s.properties.PSObject.Properties.Name) {
    $pd = $s.properties.$pn
    $t = ""
    if ($pd.'$ref') { $t = "ref:" + (EscS ($pd.'$ref' -replace '^#/components/schemas/','')) }
    elseif ($pd.type) {
      $t = $pd.type
      if ($pd.items) { if ($pd.items.'$ref') { $t += "[ref:" + (EscS ($pd.items.'$ref' -replace '^#/components/schemas/','')) + "]" } elseif ($pd.items.type) { $t += "[" + $pd.items.type + "]" } }
    }
    elseif ($pd.anyOf) { $t = "anyOf" }
    elseif ($pd.allOf) { $t = "allOf" }
    elseif ($pd.oneOf) { $t = "oneOf" }
    else { $t = "(no-type)" }
    $m = ""; if ($req -contains $pn) { $m = " *" }
    "  " + (EscS $pn) + ": " + (EscS $t) + $m
  }
}