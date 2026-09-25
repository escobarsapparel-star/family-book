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

function Get-JavaMajor([string]$JavaExe) {
  try {
    $versionText = (& $JavaExe -version 2>&1 | Out-String)
    if ($versionText -match 'version\s+"1\.(\d+)') { return [int]$Matches[1] }
    if ($versionText -match 'version\s+"(\d+)') { return [int]$Matches[1] }
  } catch {}
  return 0
}

function Use-CompatibleJava {
  $candidates = @()

  if ($env:JAVA_HOME) {
    $candidates += (Join-Path $env:JAVA_HOME "bin\java.exe")
  }

  if ($env:STUDIO_JDK) {
    $candidates += (Join-Path $env:STUDIO_JDK "bin\java.exe")
  }

  $candidates += @(
    "C:\Program Files\Android\Android Studio\jbr\bin\java.exe",
    "C:\Program Files\Android\Android Studio\jre\bin\java.exe"
  )

  foreach ($root in @(
    "C:\Program Files\Eclipse Adoptium",
    "C:\Program Files\Microsoft",
    "C:\Program Files\Java",
    "$env:USERPROFILE\.jdks"
  )) {
    if (-not (Test-Path $root)) { continue }
    $candidates += Get-ChildItem $root -Filter java.exe -Recurse -ErrorAction SilentlyContinue |
      Where-Object { $_.FullName -match '\\(bin)\\java\.exe  if ($pathJava) { $candidates += $pathJava.Source }

  foreach ($candidate in ($candidates | Select-Object -Unique)) {
    if (-not $candidate -or -not (Test-Path $candidate)) { continue }
    $major = Get-JavaMajor $candidate
    if ($major -ge 17) {
      $javaHome = Split-Path -Parent (Split-Path -Parent $candidate)
      $env:JAVA_HOME = $javaHome
      $env:Path = "$javaHome\bin;$env:Path"
      Write-Host "Using Java $major from $javaHome" -ForegroundColor Green
      return
    }
  }

  $found = if ($pathJava) { "Current PATH Java is version $(Get-JavaMajor $pathJava.Source)." } else { "No Java command was found on PATH." }
  throw "Gradle requires Java 17 or newer. $found Install/open Android Studio so its bundled JDK is available, or set JAVA_HOME to a JDK 17+ installation."
}

Use-CompatibleJava

function Ensure-AndroidSdk {
  $androidDir = Join-Path $Here "android"
  $localProperties = Join-Path $androidDir "local.properties"

  function Normalize-SdkPath([string]$PathValue) {
    if (-not $PathValue) { return $null }
    $p = $PathValue.Trim()
    if ($p -match '^sdk\.dir\s*=\s*(.+)if ($nodeMajor -lt 22) {
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
 } |
      Select-Object -ExpandProperty FullName
  }

  $pathJava = Get-Command java -ErrorAction SilentlyContinue
  if ($pathJava) { $candidates += $pathJava.Source }

  foreach ($candidate in ($candidates | Select-Object -Unique)) {
    if (-not $candidate -or -not (Test-Path $candidate)) { continue }
    $major = Get-JavaMajor $candidate
    if ($major -ge 17) {
      $javaHome = Split-Path -Parent (Split-Path -Parent $candidate)
      $env:JAVA_HOME = $javaHome
      $env:Path = "$javaHome\bin;$env:Path"
      Write-Host "Using Java $major from $javaHome" -ForegroundColor Green
      return
    }
  }

  $found = if ($pathJava) { "Current PATH Java is version $(Get-JavaMajor $pathJava.Source)." } else { "No Java command was found on PATH." }
  throw "Gradle requires Java 17 or newer. $found Install/open Android Studio so its bundled JDK is available, or set JAVA_HOME to a JDK 17+ installation."
}

Use-CompatibleJava

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
) { $p = $Matches[1].Trim() }
    $p = $p -replace '\\\\','\\'
    return $p
  }

  if (Test-Path $localProperties) {
    $sdkLine = Get-Content $localProperties -ErrorAction SilentlyContinue |
      Where-Object { $_ -match '^sdk\.dir\s*=' } |
      Select-Object -First 1
    $sdk = Normalize-SdkPath $sdkLine
    if ($sdk -and (Test-Path $sdk)) {
      $env:ANDROID_HOME = $sdk
      $env:ANDROID_SDK_ROOT = $sdk
      Write-Host "Using Android SDK from local.properties: $sdk" -ForegroundColor Green
      return
    }
  }

  $candidates = @(
    $env:ANDROID_HOME,
    $env:ANDROID_SDK_ROOT,
    "$env:LOCALAPPDATA\Android\Sdk",
    "$env:USERPROFILE\AppData\Local\Android\Sdk"
  )

  $oldProjectProps = Join-Path $env:USERPROFILE "Documents\FamilyBookAndroid\android\local.properties"
  if (Test-Path $oldProjectProps) {
    $oldLine = Get-Content $oldProjectProps -ErrorAction SilentlyContinue |
      Where-Object { $_ -match '^sdk\.dir\s*=' } |
      Select-Object -First 1
    $oldSdk = Normalize-SdkPath $oldLine
    if ($oldSdk) { $candidates += $oldSdk }
  }

  $sdk = $candidates |
    Where-Object { $_ -and (Test-Path $_) } |
    Select-Object -First 1

  if (-not $sdk) {
    throw "Android SDK was not found. Open Android Studio > SDK Manager and note the Android SDK Location, then set ANDROID_HOME or create android\local.properties with sdk.dir=<that path>."
  }

  $env:ANDROID_HOME = $sdk
  $env:ANDROID_SDK_ROOT = $sdk
  $escaped = $sdk -replace '\\','\\\\'
  Set-Content -Path $localProperties -Value "sdk.dir=$escaped" -Encoding ASCII
  Write-Host "Using Android SDK: $sdk" -ForegroundColor Green
}

Ensure-AndroidSdk

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
 } |
      Select-Object -ExpandProperty FullName
  }

  $pathJava = Get-Command java -ErrorAction SilentlyContinue
  if ($pathJava) { $candidates += $pathJava.Source }

  foreach ($candidate in ($candidates | Select-Object -Unique)) {
    if (-not $candidate -or -not (Test-Path $candidate)) { continue }
    $major = Get-JavaMajor $candidate
    if ($major -ge 17) {
      $javaHome = Split-Path -Parent (Split-Path -Parent $candidate)
      $env:JAVA_HOME = $javaHome
      $env:Path = "$javaHome\bin;$env:Path"
      Write-Host "Using Java $major from $javaHome" -ForegroundColor Green
      return
    }
  }

  $found = if ($pathJava) { "Current PATH Java is version $(Get-JavaMajor $pathJava.Source)." } else { "No Java command was found on PATH." }
  throw "Gradle requires Java 17 or newer. $found Install/open Android Studio so its bundled JDK is available, or set JAVA_HOME to a JDK 17+ installation."
}

Use-CompatibleJava

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
