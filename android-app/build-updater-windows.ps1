param(
  [switch]$Install
)

$ErrorActionPreference = "Stop"
$Here = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $Here

function Require-Command([string]$Name, [string]$Help) {
  if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
    throw "$Name was not found. $Help"
  }
}

Require-Command "node" "Install Node.js 22 or newer, then reopen PowerShell."
Require-Command "npm" "Install Node.js 22 or newer, then reopen PowerShell."
Require-Command "java" "Use the JDK configured for Android Studio (JDK 21 recommended)."

$nodeMajor = [int]((node -p "process.versions.node.split('.')[0]") 2>$null)
if ($nodeMajor -lt 22) {
  throw "Node.js 22 or newer is required. Found Node.js $(node -v)."
}

Write-Host ""
Write-Host "Family Book updater APK build" -ForegroundColor Green
Write-Host "This uses the Android debug signing key already on THIS Windows PC." -ForegroundColor Yellow
Write-Host "If your installed Family Book APK was built as a debug APK on this PC, the signature should match." -ForegroundColor Yellow
Write-Host ""

Write-Host "[1/4] Installing exact dependencies..."
npm ci

Write-Host "[2/4] Running updater tests..."
npm test

Write-Host "[3/4] Preparing the latest Family Book website and syncing Android..."
npm run sync:android

Write-Host "[4/4] Building signed debug APK..."
Push-Location (Join-Path $Here "android")
try {
  & ".\gradlew.bat" assembleDebug
  if ($LASTEXITCODE -ne 0) { throw "Gradle build failed with exit code $LASTEXITCODE." }
}
finally {
  Pop-Location
}

$sourceApk = Join-Path $Here "android\app\build\outputs\apk\debug\app-debug.apk"
if (-not (Test-Path $sourceApk)) {
  throw "Build completed but the debug APK was not found at $sourceApk"
}

$dist = Join-Path $Here "dist"
New-Item -ItemType Directory -Force -Path $dist | Out-Null
$targetApk = Join-Path $dist "FamilyBook-Updater-1.1-debug.apk"
Copy-Item $sourceApk $targetApk -Force

$hash = (Get-FileHash -Algorithm SHA256 $targetApk).Hash.ToLowerInvariant()

Write-Host ""
Write-Host "SUCCESS" -ForegroundColor Green
Write-Host "APK: $targetApk"
Write-Host "SHA-256: $hash"
Write-Host ""
Write-Host "Install this APK OVER the current Family Book app. Do not uninstall the current app first." -ForegroundColor Cyan

if ($Install) {
  Require-Command "adb" "Open Android Studio > SDK Manager and ensure Android SDK Platform-Tools is installed, then add platform-tools to PATH."
  $devices = (& adb devices) | Select-String "device$"
  if (-not $devices) {
    throw "No authorized Android device is connected. Enable USB debugging, connect the phone, and accept the authorization prompt."
  }

  Write-Host "Installing over the existing app..."
  $output = & adb install -r "$targetApk" 2>&1
  $output | ForEach-Object { Write-Host $_ }
  if ($LASTEXITCODE -ne 0) {
    if (($output -join "
") -match "UPDATE_INCOMPATIBLE|signatures do not match") {
      throw "Android rejected the upgrade because the signing key does not match the installed app. Do NOT uninstall it. Build/sign with the original key instead."
    }
    throw "ADB install failed with exit code $LASTEXITCODE."
  }
  Write-Host "Family Book updater APK installed successfully." -ForegroundColor Green
}
