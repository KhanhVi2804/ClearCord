# Database Backup For Demo

This folder contains a SQL Server backup of the demo database used with the current ClearCord branch.

## File

- `ClearCordBackendApiDb_sqlexpress_migration.bak`

## Restore

1. Open SQL Server Management Studio and connect to your SQL Server instance.
2. Right-click `Databases` and choose `Restore Database...`.
3. Select `Device`, browse to `database/ClearCordBackendApiDb_sqlexpress_migration.bak`, and restore it as `ClearCordBackendApiDb`.
4. Update `ClearCord/appsettings.json` if your SQL Server instance name is different.

## Notes

- The schema matches the EF Core migrations already checked into this repository.
- The backup includes the demo users, servers, channels, messages, notifications, and role assignments prepared for the report flow.
