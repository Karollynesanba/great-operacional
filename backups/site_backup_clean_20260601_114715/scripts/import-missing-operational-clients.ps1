param(
  [string]$SeedCsvPath = "C:\great-operacional\operacional-great\src\integrations\supabase\clientesOperacionais.csv",
  [string]$Team7CsvPath = "C:\Users\karol\Downloads\EQUIPE TIME 7 - MAIO (3).csv",
  [string]$TropaCsvPath = "C:\Users\karol\Downloads\EQUIPE TROPA DE ELITE - MAIO (3).csv",
  [string]$MockOperationalDataPath = "C:\great-operacional\operacional-great\src\integrations\supabase\mockOperationalData.ts"
)

$ErrorActionPreference = "Stop"
Add-Type -AssemblyName Microsoft.VisualBasic

function Normalize([string]$s) {
  if ([string]::IsNullOrWhiteSpace($s)) { return "" }
  return (($s.Normalize([Text.NormalizationForm]::FormD) -replace "\p{Mn}", "") -replace "\s+", " " -replace "\s*/\s*", "/").Trim().ToUpperInvariant()
}

function Slugify([string]$s) {
  $n = Normalize $s
  $n = $n.ToLowerInvariant()
  $n = $n -replace "[^a-z0-9]+", "-"
  $n = $n.Trim("-")
  if ([string]::IsNullOrWhiteSpace($n)) { $n = "cliente" }
  return $n
}

function ParseDate([string]$s) {
  if ([string]::IsNullOrWhiteSpace($s)) { return "" }
  $t = $s.Trim()
  if ($t -match "^(\d{1,2})/(\d{1,2})(?:/(\d{4}))?$") {
    $day = [int]$matches[1]
    $month = [int]$matches[2]
    $year = if ($matches[3]) { [int]$matches[3] } else { 2026 }
    return ("{0:D4}-{1:D2}-{2:D2}T00:00:00.000Z" -f $year, $month, $day)
  }
  return ""
}

function MapPeriod([string]$p) {
  $n = Normalize $p
  switch -Regex ($n) {
    "^(30 DIAS|30_DIAS|MENSAL)$" { return "MENSAL" }
    "^(90 DIAS|90_MRR|TRIMESTRAL)$" { return "TRIMESTRAL" }
    "^(180 DIAS|SEMESTRAL)$" { return "SEMESTRAL" }
    default {
      if ([string]::IsNullOrWhiteSpace($n)) { return "MENSAL" }
      return $n
    }
  }
}

function MapStatus([string]$statusText, [string]$fallback) {
  $candidate = if ([string]::IsNullOrWhiteSpace($statusText)) { $fallback } else { $statusText }
  $n = Normalize $candidate
  if ($n -match "ENCERR") { return "ENCERRADO" }
  if ($n -match "PAUS") { return "PAUSADO" }
  if ($n -match "ATIV|FALTAM|ULTIMOS|ULTIMAS") { return "ATIVO" }
  if ($n -eq "RENOVOU") { return "ATIVO" }
  return "ATIVO"
}

function GetTextFieldParser([string]$path) {
  $parser = New-Object Microsoft.VisualBasic.FileIO.TextFieldParser($path)
  $parser.TextFieldType = [Microsoft.VisualBasic.FileIO.FieldType]::Delimited
  $parser.SetDelimiters(",")
  $parser.HasFieldsEnclosedInQuotes = $true
  return $parser
}

function BuildSourceRows([string]$path, [string]$teamName, [string]$teamId, [int]$kind) {
  $parser = GetTextFieldParser $path
  $rows = New-Object System.Collections.Generic.List[object]

  try {
    while (-not $parser.EndOfData) {
      $fields = $parser.ReadFields()
      if ($fields.Length -lt 2) { continue }

      $statusTag = ([string]$fields[0]).Trim()
      if (@("SIM", "PAUSOU", "RENOVOU") -notcontains $statusTag) { continue }

      $name = ([string]$fields[1]).Trim()
      if ([string]::IsNullOrWhiteSpace($name)) { continue }

      if ($kind -eq 7) {
        $rows.Add([pscustomobject]@{
          name       = $name
          period     = if ($fields.Length -gt 3) { ([string]$fields[3]).Trim() } else { "" }
          package    = if ($fields.Length -gt 4) { ([string]$fields[4]).Trim() } else { "" }
          class      = if ($fields.Length -gt 5) { ([string]$fields[5]).Trim() } else { "" }
          gestor     = if ($fields.Length -gt 6) { ([string]$fields[6]).Trim() } else { "" }
          atendente  = if ($fields.Length -gt 7) { ([string]$fields[7]).Trim() } else { "" }
          instagram  = if ($fields.Length -gt 9) { ([string]$fields[9]).Trim() } else { "" }
          activated  = if ($fields.Length -gt 10) { ([string]$fields[10]).Trim() } else { "" }
          statusText = if ($fields.Length -gt 11) { ([string]$fields[11]).Trim() } else { "" }
          teamName   = $teamName
          teamId     = $teamId
          kind       = $kind
        }) | Out-Null
      } else {
        $rows.Add([pscustomobject]@{
          name       = $name
          period     = if ($fields.Length -gt 3) { ([string]$fields[3]).Trim() } else { "" }
          package    = if ($fields.Length -gt 2) { ([string]$fields[2]).Trim() } else { "" }
          class      = if ($fields.Length -gt 5) { ([string]$fields[5]).Trim() } else { "" }
          gestor     = "BRAYTON"
          atendente  = if ($fields.Length -gt 6) { ([string]$fields[6]).Trim() } else { "" }
          instagram  = ""
          activated  = if ($fields.Length -gt 10 -and -not [string]::IsNullOrWhiteSpace([string]$fields[10])) { ([string]$fields[10]).Trim() } else { if ($fields.Length -gt 9) { ([string]$fields[9]).Trim() } else { "" } }
          statusText = if ($fields.Length -gt 12) { ([string]$fields[12]).Trim() } else { "" }
          teamName   = $teamName
          teamId     = $teamId
          kind       = $kind
        }) | Out-Null
      }
    }
  } finally {
    $parser.Close()
  }

  return $rows
}

function New-EmptyRow([string[]]$headers) {
  $row = [ordered]@{}
  foreach ($h in $headers) {
    $row[$h] = ""
  }
  return $row
}

$seedRows = Import-Csv -Path $SeedCsvPath
if (-not $seedRows -or $seedRows.Count -eq 0) {
  throw "Seed CSV is empty: $SeedCsvPath"
}

$headers = $seedRows[0].psobject.Properties.Name
$existingNames = @{}
$existingIds = @{}

foreach ($row in $seedRows) {
  $existingNames[(Normalize $row.client_name)] = $true
  $existingIds[$row.id] = $true
}

$sourceRows = @(BuildSourceRows $Team7CsvPath "Equipe 7" "0469e3aa-5b34-42e2-b89d-f412efaa27ba" 7) + @(BuildSourceRows $TropaCsvPath "Tropa de Elite" "38c9028d-856d-481e-95c9-bb2eb8b459f5" 9)
$missingRows = $sourceRows | Where-Object { -not $existingNames.ContainsKey((Normalize $_.name)) } | Sort-Object { Normalize $_.name } -Unique

$newRows = New-Object System.Collections.Generic.List[object]

foreach ($src in $missingRows) {
  $idBase = Slugify $src.name
  $id = "seed-operational-$idBase"
  $suffix = 2
  while ($existingIds.ContainsKey($id)) {
    $id = "seed-operational-$idBase-$suffix"
    $suffix++
  }
  $existingIds[$id] = $true

  $activatedAt = ParseDate $src.activated
  $createdAt = if ([string]::IsNullOrWhiteSpace($activatedAt)) { "2026-05-25T00:00:00.000Z" } else { $activatedAt }
  $statusOperational = MapStatus $src.statusText $src.statusTag
  $onboardingStage = if ($statusOperational -eq "ENCERRADO" -or $statusOperational -eq "PAUSADO") { "CONTRATO" } else { "ATIVO" }

  $clientTier = ""
  $classNormalized = Normalize $src.class
  if ($classNormalized -eq "CLASSE A") { $clientTier = "PREMIUM" }
  elseif ($classNormalized -eq "CLASSE B" -or $classNormalized -eq "CLASSE C") { $clientTier = "POPULAR" }

  $row = New-EmptyRow $headers
  $row["id"] = $id
  $row["client_name"] = $src.name.Trim()
  $row["clinic_name"] = ""
  $row["plan"] = MapPeriod $src.period
  $row["pacote"] = $src.package.Trim()
  $row["client_tier"] = $clientTier
  $row["deal_value"] = "0.00"
  $row["recharge_value"] = ""
  $row["has_recharge"] = "f"
  $row["ad_account_name"] = $src.instagram.Trim()
  $row["pagador_anuncio"] = "CLIENTE"
  $row["creative_source"] = "Planilha Maio 2026"
  $row["commercial_id"] = ""
  $row["status_operacional"] = $statusOperational
  $row["onboarding_stage"] = $onboardingStage
  $row["stage_marketing"] = "NAO_INICIADO"
  $row["stage_trafego"] = "NAO_INICIADO"
  $row["stage_atendimento"] = "NAO_INICIADO"
  $row["team_name"] = $src.teamName
  $row["gestor"] = if ([string]::IsNullOrWhiteSpace($src.gestor)) { "BRAYTON" } else { $src.gestor }
  $row["atendente"] = $src.atendente
  $row["designer"] = ""
  $row["editor_video"] = ""
  $row["start_meeting_date"] = ""
  $row["onboarding_start_at"] = $createdAt
  $row["onboarding_done_at"] = if ($statusOperational -eq "ATIVO") { $createdAt } else { "" }
  $row["activated_at"] = $activatedAt
  $row["renewal_due_date"] = ""
  $row["renewal_date"] = ""
  $row["renewal_status"] = ""
  $row["churn_date"] = ""
  $row["churn_status"] = ""
  $row["churn_reason"] = ""
  $row["nps_sent"] = "f"
  $row["nps_answered"] = "f"
  $row["created_at"] = $createdAt
  $row["updated_at"] = $createdAt
  $row["status_updated_at"] = $createdAt

  $newRows.Add([pscustomobject]$row) | Out-Null
}

$combined = @($seedRows + $newRows)
$combined | Export-Csv -Path $SeedCsvPath -NoTypeInformation -Encoding utf8

$mockContent = Get-Content -Path $MockOperationalDataPath -Raw
$mockContent = $mockContent -replace "operacional-pipeline-criativos-v8", "operacional-pipeline-criativos-v9"
Set-Content -Path $MockOperationalDataPath -Value $mockContent -Encoding utf8

Write-Host ("Added {0} missing clients." -f $newRows.Count)
if ($newRows.Count -gt 0) {
  Write-Host "Added names:"
  $newRows | ForEach-Object { Write-Host ("- {0}" -f $_.client_name) }
}
