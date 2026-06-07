param(
    [string] $Runtime = "win-x64",
    [switch] $SelfContained
)

$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot
$projectPath = Join-Path $repoRoot "ClearCord\ClearCord.csproj"
$artifactsRoot = Join-Path $repoRoot "artifacts"
$publishDir = Join-Path $artifactsRoot "ClearCord-$Runtime"
$zipPath = Join-Path $artifactsRoot "ClearCord-$Runtime.zip"

if (-not (Get-Command "dotnet" -ErrorAction SilentlyContinue)) {
    throw "dotnet was not found. Install the .NET 8 SDK from https://dotnet.microsoft.com/download"
}

if (-not (Get-Command "npm.cmd" -ErrorAction SilentlyContinue)) {
    throw "npm was not found. Install Node.js 20 LTS or newer from https://nodejs.org/"
}

New-Item -ItemType Directory -Force -Path $artifactsRoot | Out-Null
Remove-Item -Recurse -Force -Path $publishDir -ErrorAction SilentlyContinue
Remove-Item -Force -Path $zipPath -ErrorAction SilentlyContinue

$selfContainedValue = if ($SelfContained) { "true" } else { "false" }

Write-Host "Publishing ClearCord for $Runtime..."
dotnet publish $projectPath `
    -c Release `
    -r $Runtime `
    --self-contained $selfContainedValue `
    -o $publishDir

$runHelp = @"
ClearCord Windows package

1. Install SQL Server LocalDB or configure ConnectionStrings:DefaultConnection in appsettings.json.
2. If this is a framework-dependent package, install the .NET 8 ASP.NET Core Runtime.
3. Run ClearCord.exe.
4. Open https://localhost:7187.

To use a different database, edit appsettings.json before running ClearCord.exe.
"@

Set-Content -Path (Join-Path $publishDir "RUN_THIS_PACKAGE.txt") -Value $runHelp -Encoding UTF8

Write-Host "Creating zip package..."
Compress-Archive -Path (Join-Path $publishDir "*") -DestinationPath $zipPath -Force

Write-Host "Package created: $zipPath"
