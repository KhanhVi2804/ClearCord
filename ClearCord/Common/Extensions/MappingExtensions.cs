using ClearCord.DTOs;
using ClearCord.Entities;

namespace ClearCord.Common.Extensions;

public static class MappingExtensions
{
    public static AuthUserDto ToAuthUserDto(this ApplicationUser user)
    {
        return new AuthUserDto(
            user.Id,
            user.UserName ?? string.Empty,
            user.DisplayName,
            user.Email ?? string.Empty,
            user.AvatarUrl,
            user.IsOnline);
    }

    public static UserSummaryDto ToUserSummaryDto(this ApplicationUser user)
    {
        return new UserSummaryDto(
            user.Id,
            user.UserName ?? string.Empty,
            user.DisplayName,
            user.AvatarUrl,
            user.IsOnline);
    }

    public static UserProfileDto ToUserProfileDto(this ApplicationUser user)
    {
        return new UserProfileDto(
            user.Id,
            user.UserName ?? string.Empty,
            user.DisplayName,
            user.Email ?? string.Empty,
            user.AvatarUrl,
            user.Bio,
            user.IsOnline,
            user.LastSeenAt);
    }

    public static FriendRequestDto ToFriendRequestDto(this FriendRequest request, string currentUserId)
    {
        var otherUser = request.RequesterId == currentUserId ? request.Addressee : request.Requester;

        return new FriendRequestDto(
            request.Id,
            otherUser.ToUserSummaryDto(),
            request.Status,
            request.CreatedAt,
            request.RespondedAt);
    }

    public static FriendDto ToFriendDto(this FriendRequest request, string currentUserId)
    {
        var otherUser = request.RequesterId == currentUserId ? request.Addressee : request.Requester;

        return new FriendDto(
            otherUser.Id,
            otherUser.UserName ?? string.Empty,
            otherUser.DisplayName,
            otherUser.AvatarUrl,
            otherUser.IsOnline);
    }

    public static ServerRoleDto ToServerRoleDto(this ServerRole role)
    {
        return new ServerRoleDto(
            role.Id,
            role.Name,
            role.ColorHex,
            role.Position,
            role.IsDefault,
            role.IsSystemRole,
            role.Permissions
                .OrderBy(permission => permission.Permission)
                .Select(permission => permission.Permission)
                .ToArray());
    }

    public static ServerMemberDto ToServerMemberDto(this ServerMember member, IReadOnlyCollection<ServerRole> roles)
    {
        var assignedRoles = roles
            .Where(role => role.Assignments.Any(assignment => assignment.UserId == member.UserId))
            .Select(role => role.ToServerRoleDto())
            .ToArray();

        return new ServerMemberDto(
            member.UserId,
            member.User.UserName ?? string.Empty,
            member.User.DisplayName,
            member.User.AvatarUrl,
            member.User.IsOnline,
            member.User.LastSeenAt,
            member.Nickname,
            assignedRoles,
            member.JoinedAt);
    }

    public static ServerSummaryDto ToServerSummaryDto(this Server server)
    {
        return new ServerSummaryDto(
            server.Id,
            server.Name,
            server.Description,
            server.InviteCode,
            server.IconUrl,
            server.Members.Count);
    }

    public static ChannelCategoryDto ToCategoryDto(this ChannelCategory category)
    {
        return new ChannelCategoryDto(category.Id, category.Name, category.Position);
    }

    public static ChannelDto ToChannelDto(this Channel channel)
    {
        return new ChannelDto(
            channel.Id,
            channel.ServerId,
            channel.CategoryId,
            channel.Name,
            channel.Topic,
            channel.Type,
            channel.Position);
    }

    public static AttachmentDto ToAttachmentDto(this MessageAttachment attachment)
    {
        return new AttachmentDto(
            attachment.Id,
            attachment.FileName,
            attachment.ContentType,
            attachment.Url,
            attachment.SizeInBytes,
            attachment.IsImage);
    }

    public static MessageDto ToMessageDto(this Message message)
    {
        return new MessageDto(
            message.Id,
            message.ChannelId,
            message.Content,
            message.IsEdited,
            message.IsDeleted,
            message.IsPinned,
            message.CreatedAt,
            message.UpdatedAt,
            message.Sender.ToUserSummaryDto(),
            message.ReplyToMessage is null
                ? null
                : new MessageReferenceDto(
                    message.ReplyToMessage.Id,
                    message.ReplyToMessage.Content,
                    message.ReplyToMessage.Sender.ToUserSummaryDto()),
            message.Attachments.Select(attachment => attachment.ToAttachmentDto()).ToArray(),
            message.Reactions
                .OrderBy(reaction => reaction.CreatedAt)
                .Select(reaction => new MessageReactionDto(
                    reaction.Id,
                    reaction.Emoji,
                    reaction.User.ToUserSummaryDto(),
                    reaction.CreatedAt))
                .ToArray());
    }

    public static NotificationDto ToNotificationDto(this UserNotification notification)
    {
        return new NotificationDto(
            notification.Id,
            notification.Type,
            notification.Title,
            notification.Content,
            notification.RelatedEntityType,
            notification.RelatedEntityId,
            notification.IsRead,
            notification.CreatedAt);
    }

    public static VoiceParticipantDto ToVoiceParticipantDto(this VoiceChannelParticipant participant)
    {
        return new VoiceParticipantDto(
            participant.UserId,
            participant.User.UserName ?? string.Empty,
            participant.User.DisplayName,
            participant.User.AvatarUrl,
            participant.ConnectionId,
            participant.IsMuted,
            participant.IsCameraEnabled,
            participant.IsScreenSharing,
            participant.JoinedAt);
    }
}
