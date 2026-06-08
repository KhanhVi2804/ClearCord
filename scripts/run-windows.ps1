$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot
$projectPath = Join-Path $repoRoot "ClearCord\ClearCord.csproj"

if (-not (Get-Command "dotnet" -ErrorAction SilentlyContinue)) {
    throw "dotnet was not found. Install the .NET 8 SDK from https://dotnet.microsoft.com/download"
}

$env:ASPNETCORE_ENVIRONMENT = "Development"

Write-Host "Starting ClearCord..."
Write-Host "Open https://localhost:7187 after the server starts."
dotnet run --project $projectPath --launch-profile https
