param(
  [string]$ExtensionId,
  [ValidateSet("Chrome", "Edge", "Both")]
  [string]$Browser = "Chrome"
)

$ErrorActionPreference = "Stop"

$bridgeDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoDir = Split-Path -Parent $bridgeDir
$extensionDir = Join-Path $repoDir "extansion"
$installScript = Join-Path $bridgeDir "install_native_host_windows.ps1"

function Test-ExtensionId([string]$Value) {
  return $Value -match "^[a-p]{32}$"
}

function Get-BrowserProfiles([string]$BrowserName) {
  $roots = @()
  if ($BrowserName -eq "Chrome") {
    $roots += Join-Path $env:LOCALAPPDATA "Google\Chrome\User Data"
  }
  elseif ($BrowserName -eq "Edge") {
    $roots += Join-Path $env:LOCALAPPDATA "Microsoft\Edge\User Data"
  }

  foreach ($root in $roots) {
    if (-not (Test-Path $root)) {
      continue
    }

    Get-ChildItem -Path $root -Directory -ErrorAction SilentlyContinue |
      Where-Object { $_.Name -eq "Default" -or $_.Name -like "Profile *" }
  }
}

function Find-ExtensionIdInProfile([string]$BrowserName) {
  $expectedPath = [System.IO.Path]::GetFullPath($extensionDir).TrimEnd("\")
  foreach ($profile in Get-BrowserProfiles $BrowserName) {
    foreach ($fileName in @("Secure Preferences", "Preferences")) {
      $preferencesPath = Join-Path $profile.FullName $fileName
      if (-not (Test-Path $preferencesPath)) {
        continue
      }

      try {
        $preferences = Get-Content -Path $preferencesPath -Raw -Encoding UTF8 | ConvertFrom-Json
      }
      catch {
        continue
      }

      $settings = $preferences.extensions.settings
      if (-not $settings) {
        continue
      }

      foreach ($property in $settings.PSObject.Properties) {
        $extensionPath = $property.Value.path
        if (-not $extensionPath) {
          continue
        }

        $actualPath = [System.IO.Path]::GetFullPath($extensionPath).TrimEnd("\")
        if ($actualPath -ieq $expectedPath) {
          return [ordered]@{
            ExtensionId = $property.Name
            Browser = $BrowserName
            Profile = $profile.FullName
            Path = $actualPath
          }
        }
      }
    }
  }
  return $null
}

if ($ExtensionId) {
  if (-not (Test-ExtensionId $ExtensionId)) {
    throw "ExtensionId must be the real 32-character Chrome extension ID from chrome://extensions."
  }

  & $installScript -ExtensionId $ExtensionId -Browser $Browser
  exit $LASTEXITCODE
}

$browserOrder = if ($Browser -eq "Both") { @("Chrome", "Edge") } else { @($Browser) }
$match = $null
foreach ($browserName in $browserOrder) {
  $match = Find-ExtensionIdInProfile $browserName
  if ($match) {
    break
  }
}

if (-not $match) {
  throw "Could not auto-detect QQ Frog extension ID. Open chrome://extensions, copy QQ Frog's real ID, then rerun: .\repair_native_host_windows.ps1 -ExtensionId <id> -Browser $Browser"
}

Write-Host "Detected QQ Frog extension:"
Write-Host "  Browser:     $($match.Browser)"
Write-Host "  Profile:     $($match.Profile)"
Write-Host "  ExtensionId: $($match.ExtensionId)"
Write-Host "  Path:        $($match.Path)"

& $installScript -ExtensionId $match.ExtensionId -Browser $match.Browser
