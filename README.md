# ClearCord

ClearCord is a Discord-style real-time chat application built with ASP.NET Core, SQL Server, SignalR, WebRTC signaling, and React.

The backend follows a clean layered structure with controllers, services, repositories, DTOs, entities, and an Entity Framework Core `DbContext`. The frontend is served directly by the ASP.NET Core app, so the whole project can be launched from Visual Studio with a single run button.

## Tech Stack

- ASP.NET Core Web API
- Entity Framework Core (Code First)
- SQL Server / LocalDB
- ASP.NET Core Identity + JWT
- SignalR
- WebRTC signaling
- React + Vite
- Axios

## Main Features

- Authentication: register, login, logout, forgot password, reset password
- User management: profile update, avatar upload, profile viewing
- Friend system: search users, send/accept/reject requests, friend list, unfriend
- Servers: create, join by invite, leave, member list, update, delete
- Channels: text channels, voice channels, categories, update, delete
- Real-time chat: instant messages, typing state, online state, notifications
- Message actions: edit, delete, reply, reactions, pin
- File upload: message attachments and image preview
- Voice/video workspace: WebRTC signaling, participant tracking, mic/camera/screen state
- Notifications: new messages, friend requests, server events
- Admin tools: roles, permissions, kick, ban, channel and server management

## Project Structure

```text
ClearCord.sln
|- ClearCord/
|  |- Controllers/
|  |- Data/
|  |- DTOs/
|  |- Entities/
|  |- Hubs/
|  |- Infrastructure/
|  |- Middleware/
|  |- Repositories/
|  |- Services/
|  |- wwwroot/client/
|  `- Program.cs
`- ClearCord.Frontend/
   |- src/components/
   |- src/pages/
   |- src/services/
   `- vite.config.js
```

## Requirements Reference

The original requirements are stored in the `.docx` file in the repository root.

## Run in Visual Studio

1. Open `ClearCord.sln`
2. Set `ClearCord/ClearCord.csproj` as the startup project
3. Trust the HTTPS dev certificate if needed:

```powershell
dotnet dev-certs https --trust
```

4. Press `F5` with the `https` profile

The backend will build the React frontend automatically and serve it from `wwwroot/client`.

App URLs:

- `https://localhost:7187`
- `http://localhost:5187`

## Local Development

Run backend:

```powershell
cd ClearCord
dotnet run --launch-profile https
```

Run frontend hot reload separately:

```powershell
cd ClearCord.Frontend
npm install
npm run dev
```

Then open:

- `http://127.0.0.1:5173`

## Database Configuration

Default local connection:

```json
Server=(localdb)\\MSSQLLocalDB;Database=ClearCordBackendApiDb;Trusted_Connection=True;Encrypt=False;TrustServerCertificate=True;MultipleActiveResultSets=true
```

This can be changed in `ClearCord/appsettings.json`.

## Notes

- In development, forgot-password returns a reset token directly for testing instead of sending email.
- WebRTC support in this project is signaling-focused. For production-scale calling, a TURN/SFU strategy would still be needed.
- SignalR chat uses channel-based groups and the `messageCreated` event, not the legacy `ReceiveMessage` flow.
