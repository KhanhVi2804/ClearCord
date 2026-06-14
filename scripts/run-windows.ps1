$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot
$projectPath = Join-Path $repoRoot "ClearCord\ClearCord.csproj"

if (-not (Get-Command "dotnet" -ErrorAction SilentlyContinue)) {
    throw "dotnet was not found. Install the .NET 8 SDK from https://dotnet.microsoft.com/download"
}

if (-not (Get-Command "sqllocaldb" -ErrorAction SilentlyContinue)) {
    throw "sqllocaldb was not found. Install SQL Server Express LocalDB from Visual Studio Installer or SQL Server Express LocalDB."
}

$localDbStart = & sqllocaldb start MSSQLLocalDB 2>&1
if ($LASTEXITCODE -ne 0 -and ($localDbStart -join "`n") -notmatch "already started|already running") {
    throw "Failed to start SQL Server LocalDB instance 'MSSQLLocalDB'.`n$($localDbStart -join "`n")"
}

$env:ASPNETCORE_ENVIRONMENT = "Development"

Write-Host "Starting ClearCord..."
Write-Host "Open https://localhost:7187 after the server starts."
dotnet run --project $projectPath --launch-profile https
