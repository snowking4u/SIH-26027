param()
$ErrorActionPreference = "Stop"

function EscS($s) {
  if ($null -eq $s) { return "(null)" }
  $sb = New-Object System.Text.StringBuilder
  foreach ($ch in $s.ToCharArray()) {
    $c = [int]$ch
    if ($c -ge 0x20 -and $c -le 0x7E) { [void]$sb.Append($ch) } else { [void]$sb.Append(("[U+{0:X4}]" -f $c)) }
  }
  return $sb.ToString()
}

function EscapeObj($obj) {
  if ($null -eq $obj) { return "(null)" }
  return (EscS ($obj | Out-String))
}

$o = Invoke-RestMethod -Uri "http://127.0.0.1:8011/openapi.json" -TimeoutSec 30
$C = $o.components.schemas

"=== TRUTH: real schema-ref for each endpoint our 5 services call ==="
$epts = @(
  @('/api/tms/defects','GET'), @('/api/tms/inspections','GET'), @('/api/tms/maintenance','GET'),
  @('/api/smms/alerts','GET'), @('/api/smms/inspections','GET'), @('/api/smms/maintenance','GET'),
  @('/api/smms/inspections/requests','POST'),
  @('/api/unified/defects','GET'), @('/api/unified/maintenance','GET'), @('/api/unified/block-requirements','GET'),
  @('/api/unified/block-requirements','POST'),
  @('/api/candidates/windows','GET'), @('/api/candidates/check','POST'), @('/api/candidates/generate','POST'),
  @('/api/optimization/plans','GET'), @('/api/optimization/plans','POST'),
  @('/api/optimization/plan-tasks','GET'), @('/api/optimization/plan-tasks','POST'),
  @('/api/optimization/inputs','GET'), @('/api/optimization/outputs','GET'), @('/api/optimization/runs','GET'),
  @('/api/optimization/validations','GET'), @('/api/optimization/decisions','GET'),
  @('/api/optimization/plans/{plan_id}/validate','POST')
)
foreach ($ep in $epts) {
  $path = $ep[0]; $method = $ep[1]
  if ($o.paths.PSObject.Properties.Name -contains $path) {
    $node = $o.paths.$path
    if ($node.PSObject.Properties.Name -contains $method) {
      $op = $node.$method
      "### " + (EscS $path) + " " + (EscS $method.ToUpper())
      $resp = $op.responses.'200'
      $reqbody = $null
      if ($op.requestBody) {
        $rb = $op.requestBody.content.'application/json'.schema
        if ($rb) { $reqbody = $rb }
      }
      if ($reqbody) {
        $ref = ""
        if ($reqbody.'$ref') { $ref = ($reqbody.'$ref') } elseif ($reqbody.anyOf) {
          foreach ($a in $reqbody.anyOf) { if ($a.'$ref') { $ref = $a.'$ref'; break } }
        }
        "  reqBody ref: " + (EscS ($ref -replace '^#/components/schemas/',''))
      } else { "  reqBody: none" }
      if ($resp) {
        $sch = $resp.content.'application/json'.schema
        if ($sch) {
          if ($sch.'$ref') {
            "  resp200 ref: " + (EscS ($sch.'$ref' -replace '^#/components/schemas/',''))
          } elseif ($sch.items -and $sch.items.'$ref') {
            "  resp200 array of: " + (EscS ($sch.items.'$ref' -replace '^#/components/schemas/',''))
          } elseif ($sch.type) {
            "  resp200 type: " + (EscS $sch.type) + (EscapeObj ($sch | ConvertTo-Json -Compress -Depth 3))
          }
        } else { "  resp200: (no json schema)" }
      } else { "  resp200: (no 200)" }
    } else { "### " + (EscS $path) + " " + (EscS $method.ToUpper()) + "  - NOT-A-METHOD" }
  } else { "### " + (EscS $path) + "  - PATH-NOT-FOUND (check subpath)" }
}

"`n=== FIELD DUMPS for referenced schema components (real fields only) ==="
$refnames = @(
  'TMSDefectResponse','TMSInspectionResponse','TMSMaintenanceResponse',
  'SMMSAlertResponse','SMMSInspectionResponse','SMMSMaintenanceResponse',
  'SMMSInspectionRequestCreate','SMMSInspectionRequestResponse',
  'CandidateBlockWindowResponse','CandidateCheckRequest','CandidateCheckResponse','CandidateGenerationSummary',
  'BlockPlanResponse','BlockPlanCreate','BlockPlanTaskResponse','BlockPlanTaskCreate',
  'OptimizationInputResponse','OptimizationOutputResponse','OptimizationRunResponse',
  'PlanValidationResponse','ControllerDecisionResponse',
  'BlockRequirementResponse','BlockRequirementCreate'
)
foreach ($n in $refnames) {
  if ($C.PSObject.Properties.Name -contains $n) {
    $s = $C.$n
    "### " + (EscS $n)
    if ($s.properties) {
      $req = @()
      if ($s.required) { $req = @($s.required) }
      foreach ($pn in $s.properties.PSObject.Properties.Name) {
        $pd = $s.properties.$pn
        $t = ""
        if ($pd.'$ref') { $t = "ref[ " + (EscS ($pd.'$ref' -replace '^#/components/schemas/','')) + " ]" }
        elseif ($pd.type) {
          $t = $pd.type
          if ($pd.items) {
            if ($pd.items.'$ref') { $t += "[ref:" + (EscS ($pd.items.'$ref' -replace '^#/components/schemas/','')) + "]" }
            elseif ($pd.items.type) { $t += "[" + $pd.items.type + "]" }
          }
        }
        elseif ($pd.anyOf) { $t = "anyOf" }
        elseif ($pd.allOf) { $t = "allOf" }
        else { $t = "(no-type)" }
        $m = ""; if ($req -contains $pn) { $m = " *" }
        "  " + (EscS $pn) + ": " + (EscS $t) + $m
      }
    } else { "  (no properties, enum only?)" }
  } else { "### " + (EscS $n) + "  - NOT-IN-COMPONENTS" }
}
