# ClearCord

ClearCord là ứng dụng trò chuyện realtime theo phong cách Discord, gồm backend ASP.NET Core Web API và frontend React. Hệ thống hỗ trợ chat theo kênh, nhắn tin trực tiếp, quản lý server, thông báo realtime, voice/video signaling bằng WebRTC và trợ lý Clear AI.

## Tính năng

- Đăng ký, đăng nhập, đăng xuất, quên mật khẩu và đặt lại mật khẩu bằng JWT.
- Cập nhật hồ sơ, avatar và trạng thái online/offline.
- Tìm kiếm người dùng, kết bạn và nhắn tin trực tiếp.
- Tạo, tham gia, rời và quản lý server bằng mã mời.
- Tạo category, kênh text/voice, role và permission tùy chỉnh.
- Kick/ban thành viên theo quyền.
- Chat realtime với sửa, xóa, trả lời, reaction, pin và upload file/ảnh.
- Thông báo tin nhắn, lời mời kết bạn và sự kiện server.
- Voice/video signaling: microphone, camera, chia sẻ màn hình và theo dõi participant.
- Clear AI hỗ trợ đọc chat, soạn/gửi tin nhắn và gọi voice/video.

## Công nghệ

### Backend

- .NET 8 / ASP.NET Core Web API
- Entity Framework Core 8 Code First
- SQL Server hoặc SQL Server Express LocalDB
- ASP.NET Core Identity và JWT Bearer Authentication
- SignalR và WebRTC signaling
- Repository/service layers

### Frontend

- React 18
- Vite 5
- Axios
- `@microsoft/signalr`
- JavaScript, CSS và React Hooks

## Cấu trúc dự án

```text
ClearCord.sln
├── ClearCord/                 # ASP.NET Core backend
│   ├── Controllers/           # REST API
│   ├── Data/                  # DbContext và EF migrations
│   ├── DTOs/                  # Request/response models
│   ├── Entities/              # Domain entities
│   ├── Hubs/                  # SignalR ChatHub
│   ├── Infrastructure/        # Realtime notifier và LocalDB bootstrap
│   ├── Middleware/            # Exception middleware
│   ├── Repositories/          # Data access layer
│   ├── Services/              # Business logic
│   └── Program.cs             # Cấu hình ứng dụng
├── ClearCord.Frontend/        # React/Vite client
│   ├── src/components/        # UI components
│   ├── src/pages/             # Login và Chat page
│   ├── src/services/          # Axios và SignalR clients
│   └── vite.config.js         # Vite proxy/build
├── database/                  # SQL Server backup demo
├── docs/                      # Tài liệu và smoke checklist
└── scripts/                   # Script setup, run và publish Windows
```

## Yêu cầu môi trường

- Windows 10/11 nếu dùng script Windows hoặc LocalDB.
- .NET 8 SDK.
- Node.js 20 LTS trở lên và npm.
- SQL Server Express LocalDB, SQL Server Express hoặc SQL Server.
- Visual Studio 2022 hoặc .NET CLI.

## Chạy nhanh trên Windows

Từ thư mục gốc repository, chạy setup lần đầu:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\setup-windows.ps1
```

Hoặc double-click `SETUP_CLEARCORD_WINDOWS.bat`.

Sau đó chạy ứng dụng:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\run-windows.ps1
```

Hoặc double-click `RUN_CLEARCORD_WINDOWS.bat`.

Mở ứng dụng tại:

- HTTPS: `https://localhost:7187`
- HTTP: `http://localhost:5187`

Script setup sẽ restore package .NET, cài package frontend, build React client và trust HTTPS development certificate.

## Chạy bằng Visual Studio

1. Mở `ClearCord.sln`.
2. Chọn `ClearCord/ClearCord.csproj` làm startup project.
3. Trust certificate nếu cần:

   ```powershell
   dotnet dev-certs https --trust
   ```

4. Chọn profile `https` và nhấn `F5`.

Khi build backend, MSBuild tự chạy `npm install` nếu frontend chưa có `node_modules`, sau đó chạy `npm run build`. React được build vào `ClearCord/wwwroot/client` và được backend phục vụ tại `/`.

## Chạy thủ công bằng CLI

```powershell
dotnet restore ClearCord.sln

cd ClearCord.Frontend
npm install
npm run build

cd ..\ClearCord
dotnet run --launch-profile https
```

Mở `https://localhost:7187`.

## Frontend development mode

Chạy backend trong một terminal:

```powershell
cd ClearCord
dotnet run --launch-profile https
```

Chạy frontend trong terminal khác:

```powershell
cd ClearCord.Frontend
npm install
npm run dev
```

Mở `http://127.0.0.1:5173`. Vite proxy `/api`, `/hubs` và `/uploads` đến backend `https://localhost:7187`.

Nếu cần đổi backend URL, tạo `ClearCord.Frontend/.env`:

```env
VITE_API_BASE_URL=https://localhost:7187
```

## Database

Ứng dụng tự chạy `Database.MigrateAsync()` khi khởi động và áp dụng các EF Core migrations có sẵn. Connection string mặc định trong `ClearCord/appsettings.json`:

```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Server=localhost\\SQLEXPRESS01;Database=ClearCordBackendApiDb;Trusted_Connection=True;Encrypt=False;TrustServerCertificate=True;MultipleActiveResultSets=true"
  }
}
```

Trên Windows, `LocalDbBootstrapper` có thể tự khởi động LocalDB nếu connection string dùng `(localdb)\\MSSQLLocalDB`.

Cập nhật database thủ công nếu cần:

```powershell
dotnet ef database update --project ClearCord
```

### Khôi phục backup demo

Backup nằm tại `database/ClearCordBackendApiDb_sqlexpress_migration.bak`.

1. Mở SQL Server Management Studio.
2. Chọn `Databases` → `Restore Database...`.
3. Chọn `Device` và file backup ở trên.
4. Restore với tên `ClearCordBackendApiDb`.
5. Cập nhật connection string nếu SQL Server instance khác.

Backup chứa dữ liệu demo gồm user, server, channel, message, notification và role assignment.

## Cấu hình JWT và Clear AI

Không nên lưu secret trong `appsettings.json` khi triển khai thật. Dùng User Secrets:

```powershell
dotnet user-secrets --project ClearCord set "Jwt:SecretKey" "thay-bang-secret-ngau-nhien"
dotnet user-secrets --project ClearCord set "ClearAi:Provider" "openai"
dotnet user-secrets --project ClearCord set "ClearAi:ApiKey" "your-api-key"
```

Clear AI mặc định dùng `Provider: builtin` với command handling nội bộ. Để gọi model bên ngoài, dùng `Provider: openai`, cấu hình `ClearAi:BaseUrl`, `ClearAi:Model` và `ClearAi:ApiKey`.

## API và realtime

Health check:

```http
GET /api/health
```

Các nhóm REST API chính:

- `/api/auth`: đăng ký, đăng nhập, đăng xuất, quên và đặt lại mật khẩu.
- `/api/users`: hồ sơ, avatar và tìm kiếm người dùng.
- `/api/friends`: bạn bè và friend requests.
- `/api/servers`: server, invite, members, roles và moderation.
- `/api/servers/{serverId}/categories`: quản lý category.
- `/api/servers/{serverId}/channels`: quản lý channel.
- `/api/channels/{channelId}/messages`: lịch sử, tạo message và attachment.
- `/api/messages/{messageId}`: sửa, xóa, pin và reaction.
- `/api/direct-conversations`: direct chat và direct voice.
- `/api/notifications`: đọc notification.
- `/api/channels/{channelId}/voice`: participant và trạng thái voice.
- `/api/clear-ai/assist`: gửi prompt cho Clear AI.

Endpoint cần xác thực dùng header:

```http
Authorization: Bearer <JWT_TOKEN>
```

SignalR hub:

```text
/hubs/chat
```

Các method chính gồm `JoinChannel`, `LeaveChannel`, `SendMessage`, `SendTyping`, `JoinVoiceChannel`, `LeaveVoiceChannel`, `UpdateVoiceState` và `SendWebRtcSignal`. Event tin nhắn chính là `messageCreated`.

Request mẫu có trong `ClearCord/ClearCord.http`.

## Kiểm thử

Checklist kiểm thử thủ công nằm tại `docs/SMOKE_TEST_CHECKLIST.md`, bao gồm authentication, profile, friends, server, channel, permission, chat, attachment, notification và voice/video.

Build kiểm tra cơ bản:

```powershell
dotnet build ClearCord.sln
cd ClearCord.Frontend
npm run build
```

## Đóng gói Windows

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\publish-windows.ps1
```

File zip được tạo tại `artifacts\\ClearCord-win-x64.zip`. Trên máy đích, giải nén package, chỉnh `appsettings.json` nếu cần rồi chạy `ClearCord.exe`.

## Lưu ý triển khai

- Thay `Jwt:SecretKey` mặc định bằng secret ngẫu nhiên và lưu ngoài source control.
- Không commit `ClearAi:ApiKey`; dùng User Secrets hoặc biến môi trường.
- Giới hạn CORS theo domain frontend thay vì cho phép mọi origin.
- Development có thể trả reset token trực tiếp để test; production cần tích hợp email thật.
- WebRTC hiện tập trung vào signaling; production nên bổ sung STUN/TURN và có thể cần SFU.
- File upload đang lưu local trong `wwwroot/uploads`; production nên dùng storage bền vững và giới hạn file.
- Nếu database có schema legacy không khớp migration history, hãy dùng database mới hoặc xử lý schema cũ trước khi migrate.

## License

Repository chưa khai báo giấy phép sử dụng. Vui lòng liên hệ chủ dự án trước khi sử dụng hoặc phân phối lại mã nguồn.
