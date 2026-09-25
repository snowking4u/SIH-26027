param()
$ErrorActionPreference = "Stop"
function EscS($s) {
  if ($null -eq $s) { return "(null)" }
  $sb = New-Object System.Text.StringBuilder
  foreach ($ch in $s.ToCharArray()) {
    $c = [int]$ch
    if ($c -ge 0x20 -and $c -le 0x7E) { [void]$sb.Append($ch) }
    else { [void]$sb.Append(("[U+{0:X4}]" -f $c)) }
  }
  $sb.ToString()
}
$o = Invoke-RestMethod -Uri "http://127.0.0.1:8011/openapi.json" -TimeoutSec 30
$C = $o.components.schemas
$targets = @(
  'CandidateBlockWindowResponse','CandidateCheckRequest','CandidateCheckResponse','CandidateGenerationSummary',
  'BlockRequirementResponse','BlockRequirementCreate','DefectFailureResponse','MaintenanceRequirementResponse',
  'TMSDefectResponse','SMMSAlertResponse'
)
foreach ($n in $targets) {
  if ($C.PSObject.Properties.Name -contains $n) {
    $s = $C.$n
    "### " + (EscS $n)
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
      else { $t = "(no-type)" }
      $m = ""; if ($req -contains $pn) { $m = " *" }
      "  " + (EscS $pn) + ": " + (EscS $t) + $m
    }
  } else { "### " + (EscS $n) + "  NOT-IN-COMPONENTS" }
}
"### CandidateBlockWindowResponse (available-window + id block) re-check from /api/available-windows probe was:"
$win = Invoke-RestMethod -Uri "http://127.0.0.1:8011/api/candidate-block-windows" -TimeoutSec 30 -ErrorAction SilentlyContinue
if ($win) { $win | ConvertTo-Json -Compress -Depth 4 } else { "(candidate-block-windows endpoint not present)" }
