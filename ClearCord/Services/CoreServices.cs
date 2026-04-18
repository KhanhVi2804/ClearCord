using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using ClearCord.Common.Exceptions;
using ClearCord.Common.Extensions;
using ClearCord.Configuration;
using ClearCord.DTOs;
using ClearCord.Entities;
using ClearCord.Enums;
using ClearCord.Repositories;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;

namespace ClearCord.Services;

public sealed class TokenService(IOptions<JwtSettings> jwtOptions) : ITokenService
{
    private readonly JwtSettings _jwtSettings = jwtOptions.Value;

    public AuthResponse CreateToken(ApplicationUser user)
    {
        var expiresAt = DateTimeOffset.UtcNow.AddMinutes(_jwtSettings.ExpiryMinutes);
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_jwtSettings.SecretKey));
        var credentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);
        var jti = Guid.NewGuid().ToString("N");

        var claims = new List<Claim>
        {
            new(JwtRegisteredClaimNames.Sub, user.Id),
            new(JwtRegisteredClaimNames.Jti, jti),
            new(JwtRegisteredClaimNames.Email, user.Email ?? string.Empty),
            new(ClaimTypes.NameIdentifier, user.Id),
            new(ClaimTypes.Name, user.UserName ?? string.Empty)
        };

        var token = new JwtSecurityToken(
            issuer: _jwtSettings.Issuer,
            audience: _jwtSettings.Audience,
            claims: claims,
            notBefore: DateTime.UtcNow,
            expires: expiresAt.UtcDateTime,
            signingCredentials: credentials);

        var accessToken = new JwtSecurityTokenHandler().WriteToken(token);
        return new AuthResponse(accessToken, expiresAt, user.ToAuthUserDto());
    }
}

public sealed class FileStorageService(IWebHostEnvironment environment) : IFileStorageService
{
    private const long MaxFileSizeBytes = 20 * 1024 * 1024;
    private static readonly HashSet<string> AllowedImageTypes =
    [
        "image/png",
        "image/jpeg",
        "image/gif",
        "image/webp"
    ];

    public async Task<StoredFileResult> SaveAvatarAsync(IFormFile file, CancellationToken cancellationToken = default)
    {
        ValidateFile(file);
        if (!AllowedImageTypes.Contains(file.ContentType))
        {
            throw new ApiException("Avatar uploads must be a PNG, JPEG, GIF, or WEBP image.");
        }

        return await SaveFileInternalAsync(file, "avatars", cancellationToken);
    }

    public async Task<IReadOnlyCollection<StoredFileResult>> SaveMessageFilesAsync(IList<IFormFile> files, CancellationToken cancellationToken = default)
    {
        if (files.Count > 10)
        {
            throw new ApiException("A single message can include at most 10 attachments.");
        }

        var folder = Path.Combine("attachments", DateTime.UtcNow.ToString("yyyy"), DateTime.UtcNow.ToString("MM"));
        var results = new List<StoredFileResult>();

        foreach (var file in files)
        {
            ValidateFile(file);
            results.Add(await SaveFileInternalAsync(file, folder, cancellationToken));
        }

        return results;
    }

    private async Task<StoredFileResult> SaveFileInternalAsync(IFormFile file, string relativeFolder, CancellationToken cancellationToken)
    {
        var uploadsRoot = environment.WebRootPath ?? Path.Combine(environment.ContentRootPath, "wwwroot");
        var targetFolder = Path.Combine(uploadsRoot, "uploads", relativeFolder);
        Directory.CreateDirectory(targetFolder);

        var extension = Path.GetExtension(file.FileName);
        var storedFileName = $"{Guid.NewGuid():N}{extension}";
        var absolutePath = Path.Combine(targetFolder, storedFileName);

        await using var stream = File.Create(absolutePath);
        await file.CopyToAsync(stream, cancellationToken);

        var url = $"/uploads/{relativeFolder.Replace("\\", "/")}/{storedFileName}";
        return new StoredFileResult(
            file.FileName,
            storedFileName,
            string.IsNullOrWhiteSpace(file.ContentType) ? "application/octet-stream" : file.ContentType,
            url,
            file.Length,
            file.ContentType.StartsWith("image/", StringComparison.OrdinalIgnoreCase));
    }

    private static void ValidateFile(IFormFile file)
    {
        if (file.Length <= 0)
        {
            throw new ApiException("Uploaded file is empty.");
        }

        if (file.Length > MaxFileSizeBytes)
        {
            throw new ApiException("Uploaded file exceeds the 20 MB limit.");
        }
    }
}

public sealed class NotificationService(
    INotificationRepository notificationRepository,
    IUnitOfWork unitOfWork,
    IRealtimeNotifier realtimeNotifier) : INotificationService
{
    public async Task<IReadOnlyCollection<NotificationDto>> GetForUserAsync(string userId, CancellationToken cancellationToken = default)
    {
        var notifications = await notificationRepository.GetForUserAsync(userId, cancellationToken);
        return notifications.Select(notification => notification.ToNotificationDto()).ToArray();
    }

    public async Task MarkReadAsync(Guid notificationId, string userId, CancellationToken cancellationToken = default)
    {
        var notification = await notificationRepository.GetByIdAsync(notificationId, cancellationToken)
            ?? throw new ApiException("Notification was not found.", StatusCodes.Status404NotFound);

        if (notification.UserId != userId)
        {
            throw new ApiException("You cannot modify this notification.", StatusCodes.Status403Forbidden);
        }

        notification.IsRead = true;
        await unitOfWork.SaveChangesAsync(cancellationToken);
    }

    public async Task MarkAllReadAsync(string userId, CancellationToken cancellationToken = default)
    {
        var notifications = await notificationRepository.GetForUserAsync(userId, cancellationToken);
        foreach (var notification in notifications)
        {
            notification.IsRead = true;
        }

        await unitOfWork.SaveChangesAsync(cancellationToken);
    }

    public async Task NotifyAsync(string userId, NotificationType type, string title, string content, string? relatedEntityType = null, string? relatedEntityId = null, CancellationToken cancellationToken = default)
    {
        var notification = new UserNotification
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            Type = type,
            Title = title,
            Content = content,
            RelatedEntityType = relatedEntityType,
            RelatedEntityId = relatedEntityId
        };

        await notificationRepository.AddAsync(notification, cancellationToken);
        await unitOfWork.SaveChangesAsync(cancellationToken);

        await realtimeNotifier.NotifyUserAsync(
            userId,
            "notificationCreated",
            notification.ToNotificationDto(),
            cancellationToken);
    }
}

public sealed class ConnectionService(
    IConnectionRepository connectionRepository,
    IUserRepository userRepository,
    IUnitOfWork unitOfWork,
    IRealtimeNotifier realtimeNotifier) : IConnectionService
{
    public async Task ConnectAsync(string userId, string connectionId, CancellationToken cancellationToken = default)
    {
        var existing = await connectionRepository.GetByConnectionIdAsync(connectionId, cancellationToken);
        if (existing is null)
        {
            await connectionRepository.AddAsync(new UserConnection
            {
                Id = Guid.NewGuid(),
                UserId = userId,
                ConnectionId = connectionId
            }, cancellationToken);
        }

        var user = await userRepository.GetByIdAsync(userId, cancellationToken)
            ?? throw new ApiException("User was not found.", StatusCodes.Status404NotFound);

        user.IsOnline = true;
        user.LastSeenAt = DateTimeOffset.UtcNow;
        await unitOfWork.SaveChangesAsync(cancellationToken);

        await realtimeNotifier.NotifyPresenceChangedAsync(userId, true, user.LastSeenAt, cancellationToken);
    }

    public async Task DisconnectAsync(string connectionId, CancellationToken cancellationToken = default)
    {
        var connection = await connectionRepository.GetByConnectionIdAsync(connectionId, cancellationToken);
        if (connection is null)
        {
            return;
        }

        connectionRepository.Remove(connection);

        var user = await userRepository.GetByIdAsync(connection.UserId, cancellationToken);
        await unitOfWork.SaveChangesAsync(cancellationToken);

        if (user is null)
        {
            return;
        }

        var remainingConnections = await connectionRepository.GetCountByUserIdAsync(user.Id, cancellationToken);
        if (remainingConnections == 0)
        {
            user.IsOnline = false;
            user.LastSeenAt = DateTimeOffset.UtcNow;
            await unitOfWork.SaveChangesAsync(cancellationToken);
            await realtimeNotifier.NotifyPresenceChangedAsync(user.Id, false, user.LastSeenAt, cancellationToken);
        }
    }
}

public sealed class AuthService(
    UserManager<ApplicationUser> userManager,
    ITokenService tokenService,
    IRevokedTokenRepository revokedTokenRepository,
    IUnitOfWork unitOfWork) : IAuthService
{
    public async Task<AuthResponse> RegisterAsync(RegisterRequest request, CancellationToken cancellationToken = default)
    {
        if (await userManager.FindByNameAsync(request.UserName) is not null)
        {
            throw new ApiException("Username is already taken.");
        }

        if (await userManager.FindByEmailAsync(request.Email) is not null)
        {
            throw new ApiException("Email is already registered.");
        }

        var user = new ApplicationUser
        {
            Id = Guid.NewGuid().ToString("N"),
            UserName = request.UserName.Trim(),
            Email = request.Email.Trim(),
            DisplayName = request.DisplayName.Trim(),
            EmailConfirmed = true
        };

        var result = await userManager.CreateAsync(user, request.Password);
        if (!result.Succeeded)
        {
            throw new ApiException(string.Join(" ", result.Errors.Select(error => error.Description)));
        }

        return tokenService.CreateToken(user);
    }

    public async Task<AuthResponse> LoginAsync(LoginRequest request, CancellationToken cancellationToken = default)
    {
        var lookupValue = request.EmailOrUserName.Trim().ToUpperInvariant();
        var user = await userManager.Users.FirstOrDefaultAsync(
            candidate => candidate.NormalizedEmail == lookupValue || candidate.NormalizedUserName == lookupValue,
            cancellationToken)
            ?? throw new ApiException("Invalid username/email or password.", StatusCodes.Status401Unauthorized);

        if (!await userManager.CheckPasswordAsync(user, request.Password))
        {
            throw new ApiException("Invalid username/email or password.", StatusCodes.Status401Unauthorized);
        }

        user.LastSeenAt = DateTimeOffset.UtcNow;
        await userManager.UpdateAsync(user);
        return tokenService.CreateToken(user);
    }

    public async Task LogoutAsync(string userId, string jti, DateTimeOffset expiresAt, CancellationToken cancellationToken = default)
    {
        if (await revokedTokenRepository.IsRevokedAsync(jti, cancellationToken))
        {
            return;
        }

        await revokedTokenRepository.AddAsync(new RevokedToken
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            Jti = jti,
            ExpiresAt = expiresAt
        }, cancellationToken);

        // Logout is backed by a revoked-token store so old JWTs cannot be replayed after sign-out.
        await unitOfWork.SaveChangesAsync(cancellationToken);
    }

    public async Task<ForgotPasswordResponse> ForgotPasswordAsync(ForgotPasswordRequest request, CancellationToken cancellationToken = default)
    {
        var user = await userManager.FindByEmailAsync(request.Email);
        if (user is null)
        {
            return new ForgotPasswordResponse(string.Empty, string.Empty, "If the email exists, a reset token has been generated.");
        }

        var token = await userManager.GeneratePasswordResetTokenAsync(user);
        return new ForgotPasswordResponse(
            user.Id,
            token,
            "Reset token generated. In production, this token should be sent by email.");
    }

    public async Task ResetPasswordAsync(ResetPasswordRequest request, CancellationToken cancellationToken = default)
    {
        var user = await userManager.FindByIdAsync(request.UserId)
            ?? throw new ApiException("User was not found.", StatusCodes.Status404NotFound);

        var result = await userManager.ResetPasswordAsync(user, request.Token, request.NewPassword);
        if (!result.Succeeded)
        {
            throw new ApiException(string.Join(" ", result.Errors.Select(error => error.Description)));
        }
    }
}

public sealed class UserService(
    IUserRepository userRepository,
    IFileStorageService fileStorageService,
    IUnitOfWork unitOfWork) : IUserService
{
    public async Task<UserProfileDto> GetProfileAsync(string targetUserId, CancellationToken cancellationToken = default)
    {
        var user = await userRepository.GetByIdAsync(targetUserId, cancellationToken)
            ?? throw new ApiException("User was not found.", StatusCodes.Status404NotFound);

        return user.ToUserProfileDto();
    }

    public async Task<UserProfileDto> UpdateProfileAsync(string userId, UpdateProfileRequest request, CancellationToken cancellationToken = default)
    {
        var user = await userRepository.GetByIdAsync(userId, cancellationToken)
            ?? throw new ApiException("User was not found.", StatusCodes.Status404NotFound);

        user.DisplayName = request.DisplayName.Trim();
        user.Bio = request.Bio?.Trim();

        await unitOfWork.SaveChangesAsync(cancellationToken);
        return user.ToUserProfileDto();
    }

    public async Task<UserProfileDto> UploadAvatarAsync(string userId, IFormFile avatar, CancellationToken cancellationToken = default)
    {
        var user = await userRepository.GetByIdAsync(userId, cancellationToken)
            ?? throw new ApiException("User was not found.", StatusCodes.Status404NotFound);

        var storedFile = await fileStorageService.SaveAvatarAsync(avatar, cancellationToken);
        user.AvatarUrl = storedFile.Url;

        await unitOfWork.SaveChangesAsync(cancellationToken);
        return user.ToUserProfileDto();
    }

    public async Task<IReadOnlyCollection<UserSummaryDto>> SearchAsync(string currentUserId, string term, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(term))
        {
            return Array.Empty<UserSummaryDto>();
        }

        var users = await userRepository.SearchAsync(term, currentUserId, cancellationToken);
        return users.Select(user => user.ToUserSummaryDto()).ToArray();
    }
}

public sealed class FriendService(
    IUserRepository userRepository,
    IFriendRepository friendRepository,
    INotificationService notificationService,
    IUnitOfWork unitOfWork) : IFriendService
{
    public async Task<FriendRequestDto> SendRequestAsync(string currentUserId, SendFriendRequestRequest request, CancellationToken cancellationToken = default)
    {
        if (currentUserId == request.TargetUserId)
        {
            throw new ApiException("You cannot send a friend request to yourself.");
        }

        var targetUser = await userRepository.GetByIdAsync(request.TargetUserId, cancellationToken)
            ?? throw new ApiException("Target user was not found.", StatusCodes.Status404NotFound);

        var existing = await friendRepository.GetBetweenUsersAsync(currentUserId, request.TargetUserId, cancellationToken);
        if (existing is not null)
        {
            if (existing.Status == FriendRequestStatus.Accepted)
            {
                throw new ApiException("You are already friends with this user.");
            }

            if (existing.Status == FriendRequestStatus.Pending)
            {
                throw new ApiException("A friend request already exists between these users.");
            }

            existing.RequesterId = currentUserId;
            existing.AddresseeId = request.TargetUserId;
            existing.Status = FriendRequestStatus.Pending;
            existing.CreatedAt = DateTimeOffset.UtcNow;
            existing.RespondedAt = null;

            await unitOfWork.SaveChangesAsync(cancellationToken);
            await notificationService.NotifyAsync(
                targetUser.Id,
                NotificationType.FriendRequest,
                "New friend request",
                "Someone sent you a friend request.",
                nameof(FriendRequest),
                existing.Id.ToString(),
                cancellationToken);

            return existing.ToFriendRequestDto(currentUserId);
        }

        var friendRequest = new FriendRequest
        {
            Id = Guid.NewGuid(),
            RequesterId = currentUserId,
            AddresseeId = request.TargetUserId
        };

        await friendRepository.AddAsync(friendRequest, cancellationToken);
        await unitOfWork.SaveChangesAsync(cancellationToken);

        friendRequest.Requester = await userRepository.GetByIdAsync(currentUserId, cancellationToken)
            ?? throw new ApiException("Requesting user was not found.", StatusCodes.Status404NotFound);
        friendRequest.Addressee = targetUser;

        await notificationService.NotifyAsync(
            targetUser.Id,
            NotificationType.FriendRequest,
            "New friend request",
            $"{friendRequest.Requester.DisplayName} sent you a friend request.",
            nameof(FriendRequest),
            friendRequest.Id.ToString(),
            cancellationToken);

        return friendRequest.ToFriendRequestDto(currentUserId);
    }

    public async Task<IReadOnlyCollection<FriendRequestDto>> GetPendingRequestsAsync(string currentUserId, CancellationToken cancellationToken = default)
    {
        var requests = await friendRepository.GetPendingForUserAsync(currentUserId, cancellationToken);
        return requests.Select(request => request.ToFriendRequestDto(currentUserId)).ToArray();
    }

    public async Task<IReadOnlyCollection<FriendDto>> GetFriendsAsync(string currentUserId, CancellationToken cancellationToken = default)
    {
        var requests = await friendRepository.GetAcceptedForUserAsync(currentUserId, cancellationToken);
        return requests.Select(request => request.ToFriendDto(currentUserId)).ToArray();
    }

    public async Task<FriendRequestDto> AcceptAsync(string currentUserId, Guid requestId, CancellationToken cancellationToken = default)
    {
        var request = await friendRepository.GetByIdAsync(requestId, cancellationToken)
            ?? throw new ApiException("Friend request was not found.", StatusCodes.Status404NotFound);

        if (request.AddresseeId != currentUserId)
        {
            throw new ApiException("You cannot accept this friend request.", StatusCodes.Status403Forbidden);
        }

        if (request.Status != FriendRequestStatus.Pending)
        {
            throw new ApiException("Only pending requests can be accepted.");
        }

        request.Status = FriendRequestStatus.Accepted;
        request.RespondedAt = DateTimeOffset.UtcNow;
        await unitOfWork.SaveChangesAsync(cancellationToken);

        await notificationService.NotifyAsync(
            request.RequesterId,
            NotificationType.FriendRequest,
            "Friend request accepted",
            $"{request.Addressee.DisplayName} accepted your friend request.",
            nameof(FriendRequest),
            request.Id.ToString(),
            cancellationToken);

        return request.ToFriendRequestDto(currentUserId);
    }

    public async Task<FriendRequestDto> RejectAsync(string currentUserId, Guid requestId, CancellationToken cancellationToken = default)
    {
        var request = await friendRepository.GetByIdAsync(requestId, cancellationToken)
            ?? throw new ApiException("Friend request was not found.", StatusCodes.Status404NotFound);

        if (request.AddresseeId != currentUserId)
        {
            throw new ApiException("You cannot reject this friend request.", StatusCodes.Status403Forbidden);
        }

        if (request.Status != FriendRequestStatus.Pending)
        {
            throw new ApiException("Only pending requests can be rejected.");
        }

        request.Status = FriendRequestStatus.Rejected;
        request.RespondedAt = DateTimeOffset.UtcNow;
        await unitOfWork.SaveChangesAsync(cancellationToken);
        return request.ToFriendRequestDto(currentUserId);
    }

    public async Task UnfriendAsync(string currentUserId, string friendUserId, CancellationToken cancellationToken = default)
    {
        var friendship = await friendRepository.GetBetweenUsersAsync(currentUserId, friendUserId, cancellationToken)
            ?? throw new ApiException("Friendship was not found.", StatusCodes.Status404NotFound);

        if (friendship.Status != FriendRequestStatus.Accepted)
        {
            throw new ApiException("Only accepted friendships can be removed.");
        }

        friendRepository.Remove(friendship);
        await unitOfWork.SaveChangesAsync(cancellationToken);
    }
}
