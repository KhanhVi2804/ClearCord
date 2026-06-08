# ClearCord - Windows quick start

This file is for running ClearCord after cloning or downloading the repository on another Windows machine.

## Requirements

- Windows 10/11
- .NET 8 SDK
- Node.js 20 LTS or newer
- SQL Server LocalDB, installed with Visual Studio or SQL Server Express LocalDB

## First-time setup

Double-click:

```text
SETUP_CLEARCORD_WINDOWS.bat
```

Or run:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\setup-windows.ps1
```

The setup script restores .NET packages, installs frontend packages, builds the React client, and trusts the local HTTPS certificate.

## Run the app

Double-click:

```text
RUN_CLEARCORD_WINDOWS.bat
```

Or run:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\run-windows.ps1
```

Then open:

```text
https://localhost:7187
```

The database is created and migrated automatically on startup using the connection string in `ClearCord/appsettings.json`.

## Build a shareable package

Run:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\publish-windows.ps1
```

The package is created under:

```text
artifacts\ClearCord-win-x64.zip
```

Copy that zip to another Windows machine, extract it, edit `appsettings.json` if needed, then run `ClearCord.exe`.
