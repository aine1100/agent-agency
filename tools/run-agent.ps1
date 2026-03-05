<#
.SYNOPSIS
Runs any Agency agent markdown file as a system instruction against OpenAI or Ollama.

.EXAMPLE
.\tools\run-agent.ps1 `
  -AgentFile .\specialized\agents-orchestrator.md `
  -Task "Activate NEXUS-Micro bug-fix workflow for login timeout issue." `
  -Provider openai `
  -Model gpt-4.1-mini

.EXAMPLE
.\tools\run-agent.ps1 `
  -AgentFile .\testing\testing-api-tester.md `
  -Task "Validate /health and /login endpoints against localhost:3000." `
  -Provider ollama `
  -Model llama3.1
#>

[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)]
  [string]$AgentFile,

  [Parameter(Mandatory = $false)]
  [string]$Task,

  [string]$TaskFile,

  [ValidateSet("openai", "ollama")]
  [string]$Provider = "openai",

  [string]$Model,

  [string]$OpenAIEndpoint = "https://api.openai.com/v1/responses",

  [string]$OllamaEndpoint = "http://localhost:11434/api/generate",

  [switch]$StripFrontMatter,

  [switch]$DryRun,

  [int]$TimeoutSec = 300
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

if (-not [string]::IsNullOrWhiteSpace($TaskFile)) {
  if (-not (Test-Path -Path $TaskFile -PathType Leaf)) {
    throw "Task file not found: $TaskFile"
  }
  if (-not [string]::IsNullOrWhiteSpace($Task)) {
    throw "Provide either -Task or -TaskFile, not both."
  }
  $Task = Get-Content -Path $TaskFile -Raw -Encoding UTF8
}

if ([string]::IsNullOrWhiteSpace($Task)) {
  throw "Task input is empty. Provide -Task or -TaskFile."
}

function Limit-Text {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Text,
    [int]$MaxChars = 4000
  )

  if ($Text.Length -le $MaxChars) {
    return $Text
  }

  $head = [Math]::Floor($MaxChars * 0.7)
  $tail = $MaxChars - $head
  return ($Text.Substring(0, $head) + "`n...[truncated]...`n" + $Text.Substring($Text.Length - $tail))
}

function Get-HttpErrorDetails {
  param(
    [Parameter(Mandatory = $true)]
    $ErrorRecord,
    [string]$RequestUri,
    [string]$RequestBody
  )

  $statusCode = $null
  $statusDescription = $null
  $body = $null
  $errorDetailsBody = $null

  try {
    $response = $ErrorRecord.Exception.Response
    if ($null -ne $response) {
      try {
        $statusCode = [int]$response.StatusCode
      }
      catch { }

      try {
        $statusDescription = $response.StatusDescription
      }
      catch { }

      try {
        $stream = $response.GetResponseStream()
        if ($null -ne $stream) {
          $reader = New-Object System.IO.StreamReader($stream)
          try {
            $body = $reader.ReadToEnd()
          }
          finally {
            $reader.Close()
          }
        }
      }
      catch { }
    }
  }
  catch { }

  try {
    if ($null -ne $ErrorRecord.ErrorDetails -and -not [string]::IsNullOrWhiteSpace($ErrorRecord.ErrorDetails.Message)) {
      $errorDetailsBody = $ErrorRecord.ErrorDetails.Message
    }
  }
  catch { }

  if ([string]::IsNullOrWhiteSpace($body) -and -not [string]::IsNullOrWhiteSpace($errorDetailsBody)) {
    $body = $errorDetailsBody
  }

  if ([string]::IsNullOrWhiteSpace($body)) {
    try {
      if ($null -ne $ErrorRecord.Exception -and -not [string]::IsNullOrWhiteSpace($ErrorRecord.Exception.Message)) {
        $body = $ErrorRecord.Exception.Message
      }
    }
    catch { }
  }

  if ([string]::IsNullOrWhiteSpace($body)) {
    $body = ($ErrorRecord | Out-String)
  }

  $statusLabel = "unknown"
  if ($null -ne $statusCode) {
    if ([string]::IsNullOrWhiteSpace($statusDescription)) {
      $statusLabel = "$statusCode"
    }
    else {
      $statusLabel = "$statusCode $statusDescription"
    }
  }

  $parts = New-Object System.Collections.Generic.List[string]
  [void]$parts.Add("HTTP error ($statusLabel)")
  if (-not [string]::IsNullOrWhiteSpace($RequestUri)) {
    [void]$parts.Add("Endpoint: $RequestUri")
  }
  [void]$parts.Add("Body:")
  [void]$parts.Add((Limit-Text -Text $body -MaxChars 8000))

  if (-not [string]::IsNullOrWhiteSpace($RequestBody)) {
    [void]$parts.Add("Request payload:")
    [void]$parts.Add((Limit-Text -Text $RequestBody -MaxChars 3000))
  }

  return ($parts -join "`n")
}

function Read-AgentInstructions {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Path,

    [switch]$StripFrontMatter
  )

  if (-not (Test-Path -Path $Path -PathType Leaf)) {
    throw "Agent file not found: $Path"
  }

  $raw = Get-Content -Path $Path -Raw -Encoding UTF8
  if (-not $StripFrontMatter) {
    return $raw.Trim()
  }

  if ($raw.StartsWith("---")) {
    $parts = $raw -split "(?ms)^---\s*$", 3
    if ($parts.Count -ge 3) {
      return $parts[2].Trim()
    }
  }

  return $raw.Trim()
}

function Get-OpenAIText {
  param([Parameter(Mandatory = $true)]$Response)

  function Get-PropertyValue {
    param(
      [Parameter(Mandatory = $true)]$Obj,
      [Parameter(Mandatory = $true)][string]$Name
    )

    if ($null -eq $Obj) {
      return $null
    }

    $prop = $Obj.PSObject.Properties[$Name]
    if ($null -eq $prop) {
      return $null
    }

    return $prop.Value
  }

  $outputText = Get-PropertyValue -Obj $Response -Name "output_text"
  if (-not [string]::IsNullOrWhiteSpace([string]$outputText)) {
    return [string]$outputText
  }

  $output = Get-PropertyValue -Obj $Response -Name "output"
  if ($null -ne $output) {
    $chunks = New-Object System.Collections.Generic.List[string]
    foreach ($item in @($output)) {
      $contentItems = Get-PropertyValue -Obj $item -Name "content"
      if ($null -eq $contentItems) {
        continue
      }
      foreach ($content in @($contentItems)) {
        $text = Get-PropertyValue -Obj $content -Name "text"
        if (-not [string]::IsNullOrWhiteSpace([string]$text)) {
          [void]$chunks.Add([string]$text)
        }
      }
    }
    if ($chunks.Count -gt 0) {
      return ($chunks -join "`n")
    }
  }

  $choices = Get-PropertyValue -Obj $Response -Name "choices"
  if ($null -ne $choices) {
    $choiceChunks = New-Object System.Collections.Generic.List[string]
    foreach ($choice in @($choices)) {
      $message = Get-PropertyValue -Obj $choice -Name "message"
      if ($null -eq $message) {
        continue
      }

      $messageContent = Get-PropertyValue -Obj $message -Name "content"
      if ($null -eq $messageContent) {
        continue
      }

      if ($messageContent -is [string]) {
        if (-not [string]::IsNullOrWhiteSpace($messageContent)) {
          [void]$choiceChunks.Add($messageContent)
        }
        continue
      }

      foreach ($part in @($messageContent)) {
        $partText = Get-PropertyValue -Obj $part -Name "text"
        if (-not [string]::IsNullOrWhiteSpace([string]$partText)) {
          [void]$choiceChunks.Add([string]$partText)
        }
      }
    }
    if ($choiceChunks.Count -gt 0) {
      return ($choiceChunks -join "`n")
    }
  }

  return ($Response | ConvertTo-Json -Depth 50)
}

$resolvedAgentFile = (Resolve-Path $AgentFile).Path
$instructions = Read-AgentInstructions -Path $resolvedAgentFile -StripFrontMatter:$StripFrontMatter

if ([string]::IsNullOrWhiteSpace($Model)) {
  if ($Provider -eq "openai") {
    $Model = "gpt-4.1-mini"
  }
  else {
    $Model = "llama3.1"
  }
}

if ($Provider -eq "openai") {
  $payload = @{
    model = $Model
    instructions = $instructions
    input = $Task
  }

  if ($DryRun) {
    $payload | ConvertTo-Json -Depth 20
    exit 0
  }

  if ([string]::IsNullOrWhiteSpace($env:OPENAI_API_KEY)) {
    throw "OPENAI_API_KEY is not set. Set it before using -Provider openai."
  }

  $headers = @{
    Authorization = "Bearer $($env:OPENAI_API_KEY)"
  }

  $jsonBody = $payload | ConvertTo-Json -Depth 20
  $jsonBodyBytes = [System.Text.Encoding]::UTF8.GetBytes($jsonBody)

  try {
    $response = Invoke-RestMethod `
      -Method Post `
      -Uri $OpenAIEndpoint `
      -Headers $headers `
      -ContentType "application/json; charset=utf-8" `
      -Body $jsonBodyBytes `
      -TimeoutSec $TimeoutSec
  }
  catch {
    throw (Get-HttpErrorDetails `
      -ErrorRecord $_ `
      -RequestUri $OpenAIEndpoint `
      -RequestBody $jsonBody)
  }

  Write-Output (Get-OpenAIText -Response $response)
  exit 0
}

$ollamaPayload = @{
  model = $Model
  system = $instructions
  prompt = $Task
  stream = $false
}

if ($DryRun) {
  $ollamaPayload | ConvertTo-Json -Depth 20
  exit 0
}

try {
  $ollamaJsonBody = $ollamaPayload | ConvertTo-Json -Depth 20
  $ollamaJsonBodyBytes = [System.Text.Encoding]::UTF8.GetBytes($ollamaJsonBody)

  $ollamaResponse = Invoke-RestMethod `
    -Method Post `
    -Uri $OllamaEndpoint `
    -ContentType "application/json; charset=utf-8" `
    -Body $ollamaJsonBodyBytes `
    -TimeoutSec $TimeoutSec
}
catch {
  throw (Get-HttpErrorDetails `
    -ErrorRecord $_ `
    -RequestUri $OllamaEndpoint `
    -RequestBody $ollamaJsonBody)
}

if ($null -eq $ollamaResponse.response) {
  $ollamaResponse | ConvertTo-Json -Depth 20
  exit 0
}

Write-Output $ollamaResponse.response
