param(
  [string]$ExtensionId,
  [ValidateSet("Chrome", "Edge", "Both")]
  [string]$Browser = "Chrome"
)

$ErrorActionPreference = "Stop"

if (-not $ExtensionId) {
  throw "ExtensionId is required. Open chrome://extensions, copy QQ Frog's ID, then rerun with -ExtensionId <id>."
}

if ($ExtensionId -eq "<QQ_FROG_EXTENSION_ID>" -or $ExtensionId -notmatch "^[a-p]{32}$") {
  throw "ExtensionId must be the real 32-character Chrome extension ID from chrome://extensions, not a placeholder."
}

$bridgeDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$hostName = "com.qq_frog.pdf_bridge"
$manifestDir = Join-Path $bridgeDir "native-messaging"
$manifestPath = Join-Path $manifestDir "$hostName.json"
$hostPath = Join-Path $bridgeDir "native_host.cmd"

New-Item -ItemType Directory -Force -Path $manifestDir | Out-Null

$manifest = [ordered]@{
  name = $hostName
  description = "QQ Frog local PDF bridge launcher"
  path = $hostPath
  type = "stdio"
  allowed_origins = @("chrome-extension://$ExtensionId/")
}

$manifest | ConvertTo-Json -Depth 5 | Set-Content -Path $manifestPath -Encoding UTF8

if ($Browser -eq "Chrome" -or $Browser -eq "Both") {
  New-Item -Path "HKCU:\Software\Google\Chrome\NativeMessagingHosts\$hostName" -Force | Out-Null
  Set-ItemProperty -Path "HKCU:\Software\Google\Chrome\NativeMessagingHosts\$hostName" -Name "(default)" -Value $manifestPath
  reg add "HKCU\Software\Google\Chrome\NativeMessagingHosts\$hostName" /ve /t REG_SZ /d $manifestPath /f | Out-Null
}

if ($Browser -eq "Edge" -or $Browser -eq "Both") {
  New-Item -Path "HKCU:\Software\Microsoft\Edge\NativeMessagingHosts\$hostName" -Force | Out-Null
  Set-ItemProperty -Path "HKCU:\Software\Microsoft\Edge\NativeMessagingHosts\$hostName" -Name "(default)" -Value $manifestPath
  reg add "HKCU\Software\Microsoft\Edge\NativeMessagingHosts\$hostName" /ve /t REG_SZ /d $manifestPath /f | Out-Null
}

Write-Host "Installed $hostName native messaging host:"
Write-Host "  Manifest: $manifestPath"
Write-Host "  Host:     $hostPath"
