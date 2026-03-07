<#
.SYNOPSIS
Main Nexus-Micro orchestration script.
#>

[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)]
  [string]$Task,

  [Parameter(Mandatory = $false)]
  [string]$RunId,

  [ValidateSet("openai", "ollama")]
  [string]$Provider = "openai",

  [string]$Model,

  [string]$DomainAgentFile = ".\engineering\engineering-frontend-developer.md",

  [string]$OrchestratorAgentFile = ".\specialized\agents-orchestrator.md",

  [string]$QaAgentFile = ".\testing\testing-evidence-collector.md",

  [string]$FinalAgentFile = ".\testing\testing-reality-checker.md",

  [string]$MarketingAgentFile = ".\marketing\marketing-content-creator.md",

  [string]$RunnerScript = ".\tools\run-agent.ps1",

  [string]$OutputRoot = ".\.nexus-runs",

  [string]$AppOutputDir,

  [string]$MarketingOutputDir,

  [string]$OrchestratorProvider,
  [string]$OrchestratorModel,

  [string]$DomainProvider,
  [string]$DomainModel,

  [string]$QaProvider,
  [string]$QaModel,

  [string]$FinalProvider,
  [string]$FinalModel,

  [string]$MarketingProvider,
  [string]$MarketingModel,

  [switch]$SkipMarketing,

  [switch]$StripFrontMatter,

  [switch]$DryRun,

  [int]$TimeoutSec = 300
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

Write-Output "--- NEXUS-MICRO ORCHESTRATION STARTING ---"

# Step 0: Context Setup
if ([string]::IsNullOrWhiteSpace($RunId)) {
  $RunId = [guid]::NewGuid().ToString().Substring(0, 8)
}
Write-Output "Mission Identifier: $RunId"

$RunFolder = Join-Path $OutputRoot $RunId

function Resolve-RequiredPath {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Path,
    [Parameter(Mandatory = $true)]
    [string]$Label
  )

  $candidatePaths = New-Object System.Collections.Generic.List[string]
  [void]$candidatePaths.Add($Path)

  if (-not [System.IO.Path]::IsPathRooted($Path)) {
    [void]$candidatePaths.Add((Join-Path -Path $PSScriptRoot -ChildPath $Path))

    $scriptParent = Split-Path -Path $PSScriptRoot -Parent
    if (-not [string]::IsNullOrWhiteSpace($scriptParent)) {
      [void]$candidatePaths.Add((Join-Path -Path $scriptParent -ChildPath $Path))
    }
  }

  $checked = New-Object System.Collections.Generic.List[string]
  foreach ($candidate in ($candidatePaths | Select-Object -Unique)) {
    [void]$checked.Add($candidate)
    if (Test-Path -Path $candidate -PathType Leaf) {
      return (Resolve-Path $candidate).Path
    }
  }

  throw "$Label not found: $Path. Checked: $($checked -join ', ')"
}

function Invoke-AgentStep {
  param(
    [Parameter(Mandatory = $true)]
    [string]$StepName,
    [Parameter(Mandatory = $true)]
    [string]$AgentPath,
    [Parameter(Mandatory = $true)]
    [string]$StepTask,
    [string]$StepProvider,
    [string]$StepModel
  )

  if ($DryRun) {
    return @"
[DRY_RUN] $StepName
Agent: $AgentPath
Task Preview:
$(Limit-Text -Text $StepTask -MaxChars 1200)
"@.Trim()
  }

  $stepTaskFile = [System.IO.Path]::GetTempFileName()
  Set-Content -Path $stepTaskFile -Value $StepTask -Encoding UTF8

  try {
    $effectiveProvider = if ([string]::IsNullOrWhiteSpace($StepProvider)) { $Provider } else { $StepProvider }
    $effectiveModel = if ([string]::IsNullOrWhiteSpace($StepModel)) { $Model } else { $StepModel }

    $cmd = @(
      "-ExecutionPolicy", "Bypass",
      "-File", $resolvedRunner,
      "-AgentFile", $AgentPath,
      "-TaskFile", $stepTaskFile,
      "-Provider", $effectiveProvider,
      "-TimeoutSec", $TimeoutSec
    )

    if (-not [string]::IsNullOrWhiteSpace($effectiveModel)) {
      $cmd += @("-Model", $effectiveModel)
    }
    if ($StripFrontMatter) {
      $cmd += "-StripFrontMatter"
    }
    if ($DryRun) {
      $cmd += "-DryRun"
    }

    $previousEap = $ErrorActionPreference
    $exitCode = 0
    try {
      $ErrorActionPreference = "Continue"
      $result = & powershell.exe @cmd 2>&1
      $exitCode = $LASTEXITCODE
    }
    finally {
      $ErrorActionPreference = $previousEap
    }
  }
  finally {
    Remove-Item -Path $stepTaskFile -ErrorAction SilentlyContinue
  }

  $resultLines = foreach ($item in $result) {
    if ($item -is [System.Management.Automation.ErrorRecord]) {
      if ($null -ne $item.Exception -and -not [string]::IsNullOrWhiteSpace($item.Exception.Message)) {
        $item.Exception.Message
      }
      else {
        $item.ToString()
      }
    }
    else {
      [string]$item
    }
  }

  $resultText = (($resultLines -join "`n").Trim())
  if ($exitCode -ne 0) {
    $err = $resultText
    if ([string]::IsNullOrWhiteSpace($err)) {
      $err = "No output captured from child runner."
    }
    throw "Step '$StepName' failed (exit $exitCode): $err"
  }

  return $resultText
}

function Limit-Text {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Text,
    [int]$MaxChars = 7000
  )

  if ($Text.Length -le $MaxChars) {
    return $Text
  }

  $head = [Math]::Floor($MaxChars * 0.75)
  $tail = $MaxChars - $head
  return ($Text.Substring(0, $head) + "`n`n...[truncated]...`n`n" + $Text.Substring($Text.Length - $tail))
}

function Get-RunBlock {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Text
  )

  $match = [regex]::Match($Text, '(?ms)<<<RUN>>>\s*\r?\n(?<content>.*?)\r?\n<<<END RUN>>>')
  if ($match.Success) {
    return $match.Groups["content"].Value.Trim()
  }

  return $null
}

function Write-GeneratedFilesFromBlocks {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Text,
    [Parameter(Mandatory = $true)]
    [string]$OutputDir
  )

  $matches = [regex]::Matches($Text, '(?ms)<<<FILE:(?<path>[^>]+)>>>\s*\r?\n(?<content>.*?)\r?\n<<<END FILE>>>')
  if ($matches.Count -eq 0) {
    return @()
  }

  New-Item -Path $OutputDir -ItemType Directory -Force | Out-Null
  $writtenFiles = New-Object System.Collections.Generic.List[string]

  foreach ($match in $matches) {
    $rawPath = $match.Groups["path"].Value.Trim()
    if ([string]::IsNullOrWhiteSpace($rawPath)) {
      continue
    }

    $relativePath = $rawPath -replace '/', '\'
    $relativePath = $relativePath.TrimStart('\')
    if ([System.IO.Path]::IsPathRooted($relativePath)) {
      throw "Generated file path must be relative: $rawPath"
    }
    if ($relativePath -match '(^|\\)\.\.(\\|$)') {
      throw "Generated file path cannot traverse parent directories: $rawPath"
    }

    $destinationPath = Join-Path -Path $OutputDir -ChildPath $relativePath
    $destinationDirectory = Split-Path -Path $destinationPath -Parent
    if (-not [string]::IsNullOrWhiteSpace($destinationDirectory)) {
      New-Item -Path $destinationDirectory -ItemType Directory -Force | Out-Null
    }

    $content = $match.Groups["content"].Value
    Set-Content -Path $destinationPath -Value $content -Encoding UTF8
    [void]$writtenFiles.Add($relativePath)
  }

  return @($writtenFiles.ToArray())
}

$resolvedRunner = Resolve-RequiredPath -Path $RunnerScript -Label "Runner script"
$resolvedOrchestrator = Resolve-RequiredPath -Path $OrchestratorAgentFile -Label "Orchestrator agent"
$resolvedDomain = Resolve-RequiredPath -Path $DomainAgentFile -Label "Domain agent"
$resolvedQa = Resolve-RequiredPath -Path $QaAgentFile -Label "QA agent"
$resolvedFinal = Resolve-RequiredPath -Path $FinalAgentFile -Label "Final agent"

$resolvedMarketing = $null
if (-not $SkipMarketing) {
  $resolvedMarketing = Resolve-RequiredPath -Path $MarketingAgentFile -Label "Marketing agent"
}

$runDir = $RunFolder
New-Item -Path $runDir -ItemType Directory -Force | Out-Null

if ([string]::IsNullOrWhiteSpace($AppOutputDir)) {
  $AppOutputDir = Join-Path $runDir "app"
}
if ([string]::IsNullOrWhiteSpace($MarketingOutputDir)) {
  $MarketingOutputDir = Join-Path $runDir "marketing"
}

$orchestratorTask = @"
Activate NEXUS-Micro mode.

Objective:
$Task

Required output:
1. Execution plan with clear phases
2. Risk checklist
3. Concrete handoff instructions for the specialist agent
4. Success criteria for QA
"@

Write-Output ""
Write-Output "[1) Orchestrator] Executing Agent: $resolvedOrchestrator"
Write-Output "--------------------------------------------------"
$orchestratorOutput = Invoke-AgentStep `
  -StepName "1) Orchestrator" `
  -AgentPath $resolvedOrchestrator `
  -StepTask $orchestratorTask `
  -StepProvider $OrchestratorProvider `
  -StepModel $OrchestratorModel
$orchestratorOutput | Set-Content -Path (Join-Path $runDir "01-orchestrator.txt") -Encoding UTF8

Write-Output ""
Write-Output "[2) Specialist] Executing Agent: $resolvedDomain"
Write-Output "--------------------------------------------------"
$domainOutput = Invoke-AgentStep -StepName "2) Specialist" -AgentPath $resolvedDomain -StepTask @"
You are the implementation specialist for this objective:
$Task

Orchestrator handoff and project plan:
$(Limit-Text -Text $orchestratorOutput -MaxChars 4500)

Build the runnable application now based on the Orchestrator's architecture and requirements. Do not return planning-only output. Do not delegate. Deliver a production-ready implementation.

Format Requirements:
Return ONLY file blocks in this exact format for every file in the project structure:
<<<FILE:path/to/file.ext>>>
...content...
<<<END FILE>>>

<<<RUN>>>
Commands to run/test the app locally.
<<<END RUN>>>

Include all necessary source files, components, styles, and configurations defined in the plan.
No markdown fences. No explanations outside these blocks.
"@ `
  -StepProvider $DomainProvider `
  -StepModel $DomainModel
$domainOutput | Set-Content -Path (Join-Path $runDir "02-specialist.txt") -Encoding UTF8

$generatedFiles = @()
$runNotes = $null
if (-not $DryRun) {
  $generatedFiles = Write-GeneratedFilesFromBlocks -Text $domainOutput -OutputDir $AppOutputDir
  if ($generatedFiles.Count -eq 0) {
    throw "Specialist output did not include any <<<FILE:...>>> blocks. No app files were generated."
  }

  $runNotes = Get-RunBlock -Text $domainOutput
  if (-not [string]::IsNullOrWhiteSpace($runNotes)) {
    $runNotes | Set-Content -Path (Join-Path $AppOutputDir "RUN-INSTRUCTIONS.md") -Encoding UTF8
  }
}

$generatedFilesReport = Join-Path $runDir "02-generated-files.txt"
if ($generatedFiles.Count -gt 0) {
  ($generatedFiles -join "`n") | Set-Content -Path $generatedFilesReport -Encoding UTF8
}
else {
  "No files generated (DryRun or missing file blocks)." | Set-Content -Path $generatedFilesReport -Encoding UTF8
}

$qaTask = @"
Perform QA review for this objective:
$Task

Generated app directory:
$AppOutputDir

Generated files:
$($generatedFiles -join "`n")

Specialist output (includes file contents):
$(Limit-Text -Text $domainOutput -MaxChars 12000)

Return:
- PASS or FAIL
- Evidence-based findings
- Exact fixes required if FAIL
"@

Write-Output ""
Write-Output "[3) QA] Executing Agent: $resolvedQa"
Write-Output "--------------------------------------------------"
$qaOutput = Invoke-AgentStep `
  -StepName "3) QA" `
  -AgentPath $resolvedQa `
  -StepTask $qaTask `
  -StepProvider $QaProvider `
  -StepModel $QaModel
$qaOutput | Set-Content -Path (Join-Path $runDir "03-qa.txt") -Encoding UTF8

$finalTask = @"
Final release assessment for objective:
$Task

Generated app directory:
$AppOutputDir

Generated files:
$($generatedFiles -join "`n")

Orchestrator:
$(Limit-Text -Text $orchestratorOutput -MaxChars 3000)

Specialist:
$(Limit-Text -Text $domainOutput -MaxChars 9000)

QA:
$(Limit-Text -Text $qaOutput -MaxChars 5000)

Return final verdict: READY or NEEDS WORK.
Include top blockers and next steps.
"@

Write-Output ""
Write-Output "[4) Reality Checker] Executing Agent: $resolvedFinal"
Write-Output "--------------------------------------------------"
$finalOutput = Invoke-AgentStep `
  -StepName "4) Reality Checker" `
  -AgentPath $resolvedFinal `
  -StepTask $finalTask `
  -StepProvider $FinalProvider `
  -StepModel $FinalModel
$finalOutput | Set-Content -Path (Join-Path $runDir "04-final.txt") -Encoding UTF8

$marketingOutput = ""
$marketingFiles = @()
if (-not $SkipMarketing) {
  $marketingTask = @"
Create a launch-ready marketing pack for this app objective:
$Task

App files generated:
$($generatedFiles -join "`n")

Implementation summary:
$(Limit-Text -Text $domainOutput -MaxChars 7000)

QA summary:
$(Limit-Text -Text $qaOutput -MaxChars 3500)

Return markdown and include these file blocks:
<<<FILE:marketing-plan.md>>>
...content...
<<<END FILE>>>
<<<FILE:landing-page-copy.md>>>
...content...
<<<END FILE>>>
<<<FILE:social-posts.md>>>
...content...
<<<END FILE>>>
<<<FILE:value-proposition.md>>>
...content...
<<<END FILE>>>

Keep output practical, concise, and execution-ready.
"@

  Write-Output ""
  Write-Output "[5) Marketing] Executing Agent: $resolvedMarketing"
  Write-Output "--------------------------------------------------"
  $marketingOutput = Invoke-AgentStep `
    -StepName "5) Marketing" `
    -AgentPath $resolvedMarketing `
    -StepTask $marketingTask `
    -StepProvider $MarketingProvider `
    -StepModel $MarketingModel
  $marketingOutput | Set-Content -Path (Join-Path $runDir "05-marketing.txt") -Encoding UTF8

  if (-not $DryRun) {
    $marketingFiles = Write-GeneratedFilesFromBlocks -Text $marketingOutput -OutputDir $MarketingOutputDir
  }

  $marketingFilesReport = Join-Path $runDir "05-marketing-files.txt"
  if ($marketingFiles.Count -gt 0) {
    ($marketingFiles -join "`n") | Set-Content -Path $marketingFilesReport -Encoding UTF8
  }
  else {
    "No marketing files generated (DryRun or missing file blocks)." | Set-Content -Path $marketingFilesReport -Encoding UTF8
  }
}

$summaryPath = Join-Path $runDir "SUMMARY.md"
$outputsList = @(
  "- 01-orchestrator.txt",
  "- 02-specialist.txt",
  "- 02-generated-files.txt",
  "- 03-qa.txt",
  "- 04-final.txt"
)
if (-not $SkipMarketing) {
  $outputsList += "- 05-marketing.txt"
  $outputsList += "- 05-marketing-files.txt"
}

$generatedFilesListText = if ($generatedFiles.Count -gt 0) { ($generatedFiles | ForEach-Object { "- $_" }) -join "`n" } else { "- none" }
$marketingFilesListText = if ($marketingFiles.Count -gt 0) { ($marketingFiles | ForEach-Object { "- $_" }) -join "`n" } else { "- none" }

$summary = @"
# NEXUS-Micro Run Summary

- Timestamp: $(Get-Date -Format "u")
- Provider: $Provider
- Model: $Model
- Objective: $Task
- Orchestrator Agent: $resolvedOrchestrator
- Specialist Agent: $resolvedDomain
- QA Agent: $resolvedQa
- Final Agent: $resolvedFinal
- Marketing Agent: $resolvedMarketing

## Output Directories
- Run Directory: $runDir
- App Output Directory: $AppOutputDir
- Marketing Output Directory: $MarketingOutputDir

## Generated App Files
$generatedFilesListText

## Generated Marketing Files
$marketingFilesListText

## Outputs
$($outputsList -join "`n")

## Final Verdict
$finalOutput
"@
$summary | Set-Content -Path $summaryPath -Encoding UTF8

Write-Host ""
Write-Host "NEXUS-Micro run completed."
Write-Host "Run directory: $runDir"
Write-Host "App output: $AppOutputDir"
if (-not $SkipMarketing) {
  Write-Host "Marketing output: $MarketingOutputDir"
}
Write-Host "Summary: $summaryPath"
