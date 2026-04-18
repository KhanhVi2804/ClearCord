# ClearCord Frontend

React client for the ClearCord ASP.NET Core + SignalR backend.

## Stack

- React with functional components and hooks
- Axios for REST API calls
- `@microsoft/signalr` for real-time messaging
- Vite for local development and production builds

## Backend contract used

- Base API: `https://localhost:7187`
- Hub: `https://localhost:7187/hubs/chat`
- SignalR send method: `SendMessage({ channelId, content, replyToMessageId })`
- SignalR event: `messageCreated`
- Channel join: `JoinChannel(channelId)`
- Channel leave: `LeaveChannel(channelId)`

The client intentionally does **not** use the old `ReceiveMessage` pattern.

## Run from Visual Studio

The backend project now builds the React app automatically and serves it from `wwwroot/client`.

1. Open [ClearCord.sln](/C:/Users/Admin/source/repos/ClearCord/ClearCord.sln) in Visual Studio.
2. Make sure the startup project is [ClearCord.csproj](/C:/Users/Admin/source/repos/ClearCord/ClearCord/ClearCord.csproj).
3. Trust the ASP.NET Core HTTPS development certificate if needed:

```powershell
dotnet dev-certs https --trust
```

4. Press `F5` or click the `https` launch profile.

Visual Studio will:
- build the ASP.NET Core backend
- run `npm run build` for the frontend automatically
- open the full ClearCord app at `https://localhost:7187`

## Optional Vite development mode

If you want the separate hot-reload dev server while editing frontend-only code:

1. Start the backend from `ClearCord/`

```powershell
dotnet run --launch-profile https
```

2. Start the frontend dev server from `ClearCord.Frontend/`

```powershell
npm run dev
```

3. Open `http://127.0.0.1:5173`

Vite proxies `/api`, `/hubs`, and `/uploads` to the ASP.NET Core backend.

## Production build

```powershell
npm run build
```

## Environment override

Use `.env` if you need a different backend URL:

```bash
VITE_API_BASE_URL=https://localhost:7187
```
