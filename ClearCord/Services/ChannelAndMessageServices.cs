using ClearCord.Common.Exceptions;
using ClearCord.Common.Extensions;
using ClearCord.DTOs;
using ClearCord.Entities;
using ClearCord.Enums;
using ClearCord.Repositories;

namespace ClearCord.Services;

public sealed class ChannelService(
    IChannelRepository channelRepository,
    IServerPermissionService permissionService,
    IUnitOfWork unitOfWork) : IChannelService
{
    public async Task<ChannelCategoryDto> CreateCategoryAsync(Guid serverId, string userId, CreateCategoryRequest request, CancellationToken cancellationToken = default)
    {
        await permissionService.EnsurePermissionAsync(serverId, userId, PermissionType.ManageChannels, cancellationToken);

        var category = new ChannelCategory
        {
            Id = Guid.NewGuid(),
            ServerId = serverId,
            Name = request.Name.Trim(),
            Position = request.Position
        };

        await channelRepository.AddCategoryAsync(category, cancellationToken);
        await unitOfWork.SaveChangesAsync(cancellationToken);
        return category.ToCategoryDto();
    }

    public async Task<ChannelCategoryDto> UpdateCategoryAsync(Guid categoryId, string userId, UpdateCategoryRequest request, CancellationToken cancellationToken = default)
    {
        var category = await channelRepository.GetCategoryByIdAsync(categoryId, cancellationToken)
            ?? throw new ApiException("Category was not found.", StatusCodes.Status404NotFound);

        await permissionService.EnsurePermissionAsync(category.ServerId, userId, PermissionType.ManageChannels, cancellationToken);
        category.Name = request.Name.Trim();
        category.Position = request.Position;

        await unitOfWork.SaveChangesAsync(cancellationToken);
        return category.ToCategoryDto();
    }

    public async Task DeleteCategoryAsync(Guid categoryId, string userId, CancellationToken cancellationToken = default)
    {
        var category = await channelRepository.GetCategoryByIdAsync(categoryId, cancellationToken)
            ?? throw new ApiException("Category was not found.", StatusCodes.Status404NotFound);

        await permissionService.EnsurePermissionAsync(category.ServerId, userId, PermissionType.ManageChannels, cancellationToken);
        var serverChannels = await channelRepository.GetByServerAsync(category.ServerId, cancellationToken);
        foreach (var channel in serverChannels.Where(channel => channel.CategoryId == categoryId))
        {
            channel.CategoryId = null;
        }

        channelRepository.RemoveCategory(category);
        await unitOfWork.SaveChangesAsync(cancellationToken);
    }

    public async Task<ChannelDto> CreateChannelAsync(Guid serverId, string userId, CreateChannelRequest request, CancellationToken cancellationToken = default)
    {
        await permissionService.EnsurePermissionAsync(serverId, userId, PermissionType.ManageChannels, cancellationToken);

        if (request.CategoryId.HasValue)
        {
            var category = await channelRepository.GetCategoryByIdAsync(request.CategoryId.Value, cancellationToken)
                ?? throw new ApiException("Category was not found.", StatusCodes.Status404NotFound);

            if (category.ServerId != serverId)
            {
                throw new ApiException("Category does not belong to this server.");
            }
        }

        var channel = new Channel
        {
            Id = Guid.NewGuid(),
            ServerId = serverId,
            CategoryId = request.CategoryId,
            Name = request.Name.Trim(),
            Topic = request.Topic?.Trim(),
            Type = request.Type,
            Position = request.Position
        };

        await channelRepository.AddChannelAsync(channel, cancellationToken);
        await unitOfWork.SaveChangesAsync(cancellationToken);
        return channel.ToChannelDto();
    }

    public async Task<ChannelDto> UpdateChannelAsync(Guid channelId, string userId, UpdateChannelRequest request, CancellationToken cancellationToken = default)
    {
        var channel = await channelRepository.GetByIdAsync(channelId, cancellationToken)
            ?? throw new ApiException("Channel was not found.", StatusCodes.Status404NotFound);

        await permissionService.EnsurePermissionAsync(channel.ServerId, userId, PermissionType.ManageChannels, cancellationToken);

        if (request.CategoryId.HasValue)
        {
            var category = await channelRepository.GetCategoryByIdAsync(request.CategoryId.Value, cancellationToken)
                ?? throw new ApiException("Category was not found.", StatusCodes.Status404NotFound);

            if (category.ServerId != channel.ServerId)
            {
                throw new ApiException("Category does not belong to this server.");
            }
        }

        channel.Name = request.Name.Trim();
        channel.Topic = request.Topic?.Trim();
        channel.Position = request.Position;
        channel.CategoryId = request.CategoryId;

        await unitOfWork.SaveChangesAsync(cancellationToken);
        return channel.ToChannelDto();
    }

    public async Task DeleteChannelAsync(Guid channelId, string userId, CancellationToken cancellationToken = default)
    {
        var channel = await channelRepository.GetByIdAsync(channelId, cancellationToken)
            ?? throw new ApiException("Channel was not found.", StatusCodes.Status404NotFound);

        await permissionService.EnsurePermissionAsync(channel.ServerId, userId, PermissionType.ManageChannels, cancellationToken);
        channelRepository.RemoveChannel(channel);
        await unitOfWork.SaveChangesAsync(cancellationToken);
    }
}

public sealed class MessageService(
    IMessageRepository messageRepository,
    IChannelRepository channelRepository,
    IServerRepository serverRepository,
    IUserRepository userRepository,
    IFileStorageService fileStorageService,
    IServerPermissionService permissionService,
    INotificationService notificationService,
    IRealtimeNotifier realtimeNotifier,
    IUnitOfWork unitOfWork) : IMessageService
{
    public async Task<IReadOnlyCollection<MessageDto>> GetChannelMessagesAsync(Guid channelId, string userId, int page, int pageSize, CancellationToken cancellationToken = default)
    {
        var channel = await RequireTextChannelAsync(channelId, cancellationToken);
        await permissionService.EnsurePermissionAsync(channel.ServerId, userId, PermissionType.ViewChannels, cancellationToken);

        var messages = await messageRepository.GetChannelMessagesAsync(channelId, page, Math.Clamp(pageSize, 1, 100), cancellationToken);
        return messages.OrderBy(message => message.CreatedAt).Select(message => message.ToMessageDto()).ToArray();
    }

    public async Task<MessageDto> CreateAsync(Guid channelId, string userId, string? content, Guid? replyToMessageId, IList<IFormFile>? files, CancellationToken cancellationToken = default)
    {
        var channel = await RequireTextChannelAsync(channelId, cancellationToken);
        await permissionService.EnsurePermissionAsync(channel.ServerId, userId, PermissionType.SendMessages, cancellationToken);

        if (string.IsNullOrWhiteSpace(content) && (files is null || files.Count == 0))
        {
            throw new ApiException("A message must include text content or at least one attachment.");
        }

        Message? replyToMessage = null;
        if (replyToMessageId.HasValue)
        {
            replyToMessage = await messageRepository.GetByIdAsync(replyToMessageId.Value, cancellationToken)
                ?? throw new ApiException("Reply target was not found.", StatusCodes.Status404NotFound);

            if (replyToMessage.ChannelId != channelId)
            {
                throw new ApiException("Replies must target a message in the same channel.");
            }
        }

        var sender = await userRepository.GetByIdAsync(userId, cancellationToken)
            ?? throw new ApiException("User was not found.", StatusCodes.Status404NotFound);

        var message = new Message
        {
            Id = Guid.NewGuid(),
            ChannelId = channelId,
            SenderId = userId,
            Sender = sender,
            Content = string.IsNullOrWhiteSpace(content) ? null : content.Trim(),
            ReplyToMessageId = replyToMessageId,
            ReplyToMessage = replyToMessage
        };

        if (files is not null && files.Count > 0)
        {
            var storedFiles = await fileStorageService.SaveMessageFilesAsync(files, cancellationToken);
            foreach (var file in storedFiles)
            {
                message.Attachments.Add(new MessageAttachment
                {
                    Id = Guid.NewGuid(),
                    MessageId = message.Id,
                    FileName = file.FileName,
                    StoredFileName = file.StoredFileName,
                    ContentType = file.ContentType,
                    Url = file.Url,
                    SizeInBytes = file.SizeInBytes,
                    IsImage = file.IsImage
                });
            }
        }

        await messageRepository.AddMessageAsync(message, cancellationToken);
        await unitOfWork.SaveChangesAsync(cancellationToken);

        var dto = message.ToMessageDto();
        await realtimeNotifier.NotifyChannelAsync(channelId, "messageCreated", dto, cancellationToken);

        var channelMembers = await serverRepository.GetMembersAsync(channel.ServerId, cancellationToken);
        foreach (var memberId in channelMembers.Where(member => member.UserId != userId).Select(member => member.UserId))
        {
            await notificationService.NotifyAsync(
                memberId,
                NotificationType.Message,
                $"New message in #{channel.Name}",
                $"{sender.DisplayName}: {TrimForNotification(message.Content)}",
                nameof(Channel),
                channelId.ToString(),
                cancellationToken);
        }

        return dto;
    }

    public async Task<MessageDto> UpdateAsync(Guid messageId, string userId, UpdateMessageRequest request, CancellationToken cancellationToken = default)
    {
        var message = await messageRepository.GetByIdAsync(messageId, cancellationToken)
            ?? throw new ApiException("Message was not found.", StatusCodes.Status404NotFound);

        if (message.SenderId != userId)
        {
            await permissionService.EnsurePermissionAsync(message.Channel.ServerId, userId, PermissionType.ManageMessages, cancellationToken);
        }

        if (message.IsDeleted)
        {
            throw new ApiException("Deleted messages cannot be edited.");
        }

        message.Content = request.Content.Trim();
        message.IsEdited = true;
        message.UpdatedAt = DateTimeOffset.UtcNow;
        await unitOfWork.SaveChangesAsync(cancellationToken);

        var dto = message.ToMessageDto();
        await realtimeNotifier.NotifyChannelAsync(message.ChannelId, "messageUpdated", dto, cancellationToken);
        return dto;
    }

    public async Task DeleteAsync(Guid messageId, string userId, CancellationToken cancellationToken = default)
    {
        var message = await messageRepository.GetByIdAsync(messageId, cancellationToken)
            ?? throw new ApiException("Message was not found.", StatusCodes.Status404NotFound);

        if (message.SenderId != userId)
        {
            await permissionService.EnsurePermissionAsync(message.Channel.ServerId, userId, PermissionType.ManageMessages, cancellationToken);
        }

        message.Content = null;
        message.IsDeleted = true;
        message.DeletedAt = DateTimeOffset.UtcNow;
        await unitOfWork.SaveChangesAsync(cancellationToken);

        await realtimeNotifier.NotifyChannelAsync(message.ChannelId, "messageDeleted", new { messageId }, cancellationToken);
    }

    public async Task<MessageDto> TogglePinAsync(Guid messageId, string userId, CancellationToken cancellationToken = default)
    {
        var message = await messageRepository.GetByIdAsync(messageId, cancellationToken)
            ?? throw new ApiException("Message was not found.", StatusCodes.Status404NotFound);

        var hasPinPermission = await permissionService.HasPermissionAsync(message.Channel.ServerId, userId, PermissionType.PinMessages, cancellationToken)
            || await permissionService.HasPermissionAsync(message.Channel.ServerId, userId, PermissionType.ManageMessages, cancellationToken);

        if (!hasPinPermission)
        {
            throw new ApiException("You do not have permission to pin messages.", StatusCodes.Status403Forbidden);
        }

        message.IsPinned = !message.IsPinned;
        await unitOfWork.SaveChangesAsync(cancellationToken);

        var dto = message.ToMessageDto();
        await realtimeNotifier.NotifyChannelAsync(message.ChannelId, "messagePinnedChanged", dto, cancellationToken);
        return dto;
    }

    public async Task<MessageDto> AddReactionAsync(Guid messageId, string userId, ToggleReactionRequest request, CancellationToken cancellationToken = default)
    {
        var message = await messageRepository.GetByIdAsync(messageId, cancellationToken)
            ?? throw new ApiException("Message was not found.", StatusCodes.Status404NotFound);

        await permissionService.EnsurePermissionAsync(message.Channel.ServerId, userId, PermissionType.ViewChannels, cancellationToken);

        var reaction = await messageRepository.GetReactionAsync(messageId, userId, request.Emoji.Trim(), cancellationToken);
        if (reaction is null)
        {
            await messageRepository.AddReactionAsync(new MessageReaction
            {
                Id = Guid.NewGuid(),
                MessageId = messageId,
                UserId = userId,
                Emoji = request.Emoji.Trim()
            }, cancellationToken);

            await unitOfWork.SaveChangesAsync(cancellationToken);
            message = await messageRepository.GetByIdAsync(messageId, cancellationToken)
                ?? throw new ApiException("Message was not found.", StatusCodes.Status404NotFound);
        }

        var dto = message.ToMessageDto();
        await realtimeNotifier.NotifyChannelAsync(message.ChannelId, "messageReactionChanged", dto, cancellationToken);
        return dto;
    }

    public async Task<MessageDto> RemoveReactionAsync(Guid messageId, string userId, string emoji, CancellationToken cancellationToken = default)
    {
        var message = await messageRepository.GetByIdAsync(messageId, cancellationToken)
            ?? throw new ApiException("Message was not found.", StatusCodes.Status404NotFound);

        await permissionService.EnsurePermissionAsync(message.Channel.ServerId, userId, PermissionType.ViewChannels, cancellationToken);

        var reaction = await messageRepository.GetReactionAsync(messageId, userId, emoji.Trim(), cancellationToken)
            ?? throw new ApiException("Reaction was not found.", StatusCodes.Status404NotFound);

        messageRepository.RemoveReaction(reaction);
        await unitOfWork.SaveChangesAsync(cancellationToken);

        message = await messageRepository.GetByIdAsync(messageId, cancellationToken)
            ?? throw new ApiException("Message was not found.", StatusCodes.Status404NotFound);

        var dto = message.ToMessageDto();
        await realtimeNotifier.NotifyChannelAsync(message.ChannelId, "messageReactionChanged", dto, cancellationToken);
        return dto;
    }

    private async Task<Channel> RequireTextChannelAsync(Guid channelId, CancellationToken cancellationToken)
    {
        var channel = await channelRepository.GetByIdAsync(channelId, cancellationToken)
            ?? throw new ApiException("Channel was not found.", StatusCodes.Status404NotFound);

        if (channel.Type != ChannelType.Text)
        {
            throw new ApiException("This action is only valid for text channels.");
        }

        return channel;
    }

    private static string TrimForNotification(string? content)
    {
        if (string.IsNullOrWhiteSpace(content))
        {
            return "sent an attachment.";
        }

        return content.Length <= 80 ? content : $"{content[..77]}...";
    }
}
