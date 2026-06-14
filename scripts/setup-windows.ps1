$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot
$frontendRoot = Join-Path $repoRoot "ClearCord.Frontend"
$solutionPath = Join-Path $repoRoot "ClearCord.sln"

function Assert-Command {
    param(
        [Parameter(Mandatory = $true)]
        [string] $Name,
        [Parameter(Mandatory = $true)]
        [string] $InstallHint
    )

    if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
        throw "$Name was not found. $InstallHint"
    }
}

function Ensure-LocalDbInstance {
    param(
        [Parameter(Mandatory = $true)]
        [string] $InstanceName
    )

    Assert-Command "sqllocaldb" "Install SQL Server Express LocalDB from Visual Studio Installer or SQL Server Express LocalDB."

    Write-Host "Ensuring SQL Server LocalDB instance '$InstanceName' is available..."
    $infoOutput = & sqllocaldb info $InstanceName 2>&1
    if ($LASTEXITCODE -ne 0 -and ($infoOutput -join "`n") -match "does not exist|not exist") {
        & sqllocaldb create $InstanceName
        if ($LASTEXITCODE -ne 0) {
            throw "Failed to create LocalDB instance '$InstanceName'."
        }
    } elseif ($LASTEXITCODE -ne 0) {
        throw "Failed to inspect LocalDB instance '$InstanceName'.`n$($infoOutput -join "`n")"
    }

    $startOutput = & sqllocaldb start $InstanceName 2>&1
    if ($LASTEXITCODE -ne 0 -and ($startOutput -join "`n") -notmatch "already started|already running") {
        throw "Failed to start LocalDB instance '$InstanceName'.`n$($startOutput -join "`n")"
    }
}

Write-Host "Checking required tools..."
Assert-Command "dotnet" "Install the .NET 8 SDK from https://dotnet.microsoft.com/download"
Assert-Command "node" "Install Node.js 20 LTS or newer from https://nodejs.org/"
Assert-Command "npm.cmd" "Install Node.js 20 LTS or newer from https://nodejs.org/"
Ensure-LocalDbInstance "MSSQLLocalDB"

Write-Host "Trusting the local HTTPS development certificate..."
dotnet dev-certs https --trust

Write-Host "Restoring .NET packages..."
dotnet restore $solutionPath

Write-Host "Installing frontend packages..."
Push-Location $frontendRoot
try {
    if (Test-Path "package-lock.json") {
        npm.cmd ci
    } else {
        npm.cmd install
    }

    Write-Host "Building frontend..."
    npm.cmd run build
} finally {
    Pop-Location
}

Write-Host "Building ClearCord..."
dotnet build $solutionPath -c Release

Write-Host ""
Write-Host "Setup complete. Run RUN_CLEARCORD_WINDOWS.bat to start the app."
