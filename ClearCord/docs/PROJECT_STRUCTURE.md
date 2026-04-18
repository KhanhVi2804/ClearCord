# ClearCord Backend Structure

The backend implementation was designed from the Word requirement document in the project root and organized as an API-first ASP.NET Core application.

## Main folders

- `Common`
  Shared exceptions and mapping helpers.
- `Configuration`
  Strongly-typed settings such as JWT configuration.
- `Controllers`
  Thin REST API endpoints for auth, users, friends, servers, channels, messages, notifications, and voice.
- `DTOs`
  Request and response contracts for the REST API and SignalR/WebRTC signaling flows.
- `Data`
  `ApplicationDbContext` and EF Core relationship configuration.
- `Entities`
  Code-first domain models for users, friendships, servers, roles, channels, messages, attachments, notifications, presence, and voice participants.
- `Enums`
  Shared enums such as channel type, notification type, permissions, and WebRTC signal type.
- `Hubs`
  `ChatHub` for real-time chat, typing, presence, notifications, voice state, and WebRTC signaling.
- `Infrastructure`
  SignalR-backed notifier implementation and group helpers.
- `Middleware`
  Centralized API exception handling.
- `Repositories`
  Query/data-access layer over EF Core.
- `Services`
  Business logic for authentication, profiles, friendships, server management, channel management, messages, notifications, presence, and voice participation.
- `wwwroot/uploads`
  Runtime file storage path for avatars and message attachments.

## Important entry points

- `Program.cs`
  DI registration, JWT auth, SignalR, static file hosting, and database initialization.
- `ClearCord.http`
  Sample requests for the major API workflows.
- `appsettings.json`
  SQL Server and JWT configuration.

## Database design highlights

- Authentication and user data: `ApplicationUser`, `RevokedToken`, `UserConnection`
- Friend system: `FriendRequest`
- Discord-like server model: `Server`, `ServerMember`, `ServerRole`, `ServerRolePermission`, `ServerRoleAssignment`, `ServerBan`
- Channel model: `ChannelCategory`, `Channel`
- Messaging: `Message`, `MessageAttachment`, `MessageReaction`
- Notifications: `UserNotification`
- Voice/video signaling support: `VoiceChannelParticipant`
