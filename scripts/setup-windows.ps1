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

Write-Host "Checking required tools..."
Assert-Command "dotnet" "Install the .NET 8 SDK from https://dotnet.microsoft.com/download"
Assert-Command "node" "Install Node.js 20 LTS or newer from https://nodejs.org/"
Assert-Command "npm.cmd" "Install Node.js 20 LTS or newer from https://nodejs.org/"

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
