using System.Globalization;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using System.Text.RegularExpressions;
using ClearCord.Common.Exceptions;
using ClearCord.Common.Extensions;
using ClearCord.Configuration;
using ClearCord.DTOs;
using ClearCord.Entities;
using ClearCord.Enums;
using ClearCord.Repositories;
using Microsoft.Extensions.Options;

namespace ClearCord.Services;

public sealed class ClearAiService(
    IFriendRepository friendRepository,
    IServerRepository serverRepository,
    IChannelRepository channelRepository,
    IMessageService messageService,
    INotificationRepository notificationRepository,
    IDirectConversationService directConversationService,
    IServerPermissionService permissionService,
    IHttpClientFactory httpClientFactory,
    IOptions<ClearAiSettings> settingsOptions) : IClearAiService
{
    private static readonly Regex SendMessageRegex = new(
        @"^(?:nh[aă]n|nhắn|g[uư]i|gửi|send)\s+(?:tin\s+(?:nh[aă]n|nhắn)|message)?\s*(?:cho|to)?\s+(?<target>.+?)(?:\s*(?:r[aằ]ng|rang|l[aà]|la|saying|that)\s+|:\s*)(?<content>.+)$",
        RegexOptions.IgnoreCase | RegexOptions.CultureInvariant | RegexOptions.Compiled);

    private static readonly Regex DraftSendMessageRegex = new(
        @"^(?:(?:nh[aă]n|nhắn|g[uư]i|gửi|send)\s+(?:tin\s+(?:nh[aă]n|nhắn)|message)?(?:\s+gi[uú]p\s+t[oôơ]i|\s+cho\s+t[oôơ]i|\s+giup\s+toi)?)(?:\s+(?:cho|to)\s+(?<target>.+))?$",
        RegexOptions.IgnoreCase | RegexOptions.CultureInvariant | RegexOptions.Compiled);

    private static readonly Regex SendCurrentChannelMessageRegex = new(
        @"^(?:(?:nh[aă]n|nhắn|g[uư]i|gửi|send|post)\s+(?:tin\s+(?:nh[aă]n|nhắn)|message)?\s*(?:v[aà]o|vao|trong|l[eê]n|len|to)?\s*(?:k[eê]nh|kenh|channel|chat)(?:\s+(?:chat|text))?(?:\s+(?:n[aà]y|nay|hi[eệ]n\s+t[aạ]i|hien\s+tai|this|current))?(?:\s*(?:r[aằ]ng|rang|l[aà]|la|that|saying)\s+|:\s*)(?<content>.+))$",
        RegexOptions.IgnoreCase | RegexOptions.CultureInvariant | RegexOptions.Compiled);

    private static readonly Regex DraftCurrentChannelMessageRegex = new(
        @"^(?:(?:nh[aă]n|nhắn|g[uư]i|gửi|send|post)\s+(?:tin\s+(?:nh[aă]n|nhắn)|message)?\s*(?:v[aà]o|vao|trong|l[eê]n|len|to)?\s*(?:k[eê]nh|kenh|channel|chat)(?:\s+(?:chat|text))?(?:\s+(?:n[aà]y|nay|hi[eệ]n\s+t[aạ]i|hien\s+tai|this|current))?)$",
        RegexOptions.IgnoreCase | RegexOptions.CultureInvariant | RegexOptions.Compiled);

    private static readonly Regex ReadMessagesBySenderRegex = new(
        @"^(?:(?:đọc|doc|read)\s+(?:tin\s+nhắn|tin\s+nhan|messages?|message)(?:\s+(?:mới|moi|gần|gan|nhất|nhat|latest|newest)){0,4}\s+(?:của|cua|từ|tu|from)\s+(?<target>.+)|read\s+(?<targetAlt>.+?)'?s\s+(?:latest\s+|newest\s+)?messages?)$",
        RegexOptions.IgnoreCase | RegexOptions.CultureInvariant | RegexOptions.Compiled);

    private static readonly Regex ReadMessagesRegex = new(
        @"^(?:(?:đọc|doc|read)\s+(?:tin\s+nhắn|tin\s+nhan|messages?|message)(?:\s+(?:mới|moi|gần|gan|nhất|nhat|latest|newest)){0,4}|read\s+(?:this\s+)?(?:chat|conversation)(?:\s+(?:latest|newest))?)$",
        RegexOptions.IgnoreCase | RegexOptions.CultureInvariant | RegexOptions.Compiled);

    private static readonly Regex VoiceCallRegex = new(
        @"^(?:(?:g[oọ]i|gọi|call)\s+(?:cho|to)\s+|(?:voice\s+call)\s+)(?<target>.+)$",
        RegexOptions.IgnoreCase | RegexOptions.CultureInvariant | RegexOptions.Compiled);

    private static readonly Regex VideoCallRegex = new(
        @"^(?:(?:video\s*call|call\s+video|g[oọ]i\s+video|m[oơ]\s+video)\s+(?:cho|to)?\s*)(?<target>.+)$",
        RegexOptions.IgnoreCase | RegexOptions.CultureInvariant | RegexOptions.Compiled);

    private readonly ClearAiSettings settings = settingsOptions.Value;

    public async Task<ClearAiResponseDto> AssistAsync(string userId, ClearAiRequest request, CancellationToken cancellationToken = default)
    {
        var prompt = request.Prompt.Trim();
        if (string.IsNullOrWhiteSpace(prompt))
        {
            throw new ApiException("Prompt is required.");
        }

        var language = ResolveLanguage(request.Language, prompt);
        var command = StripVoiceCommandTerminator(StripWakePhrase(prompt, settings.AssistantName));
        var normalizedCommand = NormalizeCommandForParsing(command);

        if (string.IsNullOrWhiteSpace(command))
        {
            return BuildHelpResponse(language);
        }

        if (TryParseNamedChannelSendCommand(normalizedCommand, out var namedChannelText, out var namedChannelContent, out var namedChannelDraft))
        {
            return namedChannelDraft
                ? await HandleDraftNamedChannelMessageAsync(userId, request, namedChannelText!, language, cancellationToken)
                : await HandleSendNamedChannelMessageAsync(userId, request, namedChannelText!, namedChannelContent!, language, cancellationToken);
        }

        var sendCurrentChannelMatch = SendCurrentChannelMessageRegex.Match(command);
        if (sendCurrentChannelMatch.Success)
        {
            return await HandleSendCurrentChannelMessageAsync(userId, request, sendCurrentChannelMatch, language, cancellationToken);
        }

        var draftCurrentChannelMatch = DraftCurrentChannelMessageRegex.Match(command);
        if (draftCurrentChannelMatch.Success)
        {
            return HandleDraftCurrentChannelMessage(request, language);
        }

        var sendMatch = SendMessageRegex.Match(command);
        if (sendMatch.Success)
        {
            return await HandleSendMessageAsync(userId, sendMatch, language, cancellationToken);
        }

        var draftSendMatch = DraftSendMessageRegex.Match(command);
        if (draftSendMatch.Success)
        {
            return await HandleDraftSendMessageAsync(userId, draftSendMatch, language, cancellationToken);
        }

        if (TryParseNamedChannelReadCommand(normalizedCommand, out var readChannelText, out var readSenderText, out var readLatestOnly))
        {
            return await HandleReadMessagesFromNamedChannelAsync(
                userId,
                request,
                readChannelText!,
                readSenderText,
                language,
                readLatestOnly,
                cancellationToken);
        }

        if (LooksLikeReadMessagesCommand(normalizedCommand))
        {
            return await HandleReadMessagesAsync(
                userId,
                request,
                ExtractReadTargetFromNormalizedCommand(normalizedCommand),
                language,
                WantsLatestMessageOnly(normalizedCommand),
                RefersToCurrentChannel(normalizedCommand),
                cancellationToken);
        }

        if (WantsLatestMessageSender(command))
        {
            return await HandleLatestMessageSenderAsync(userId, request, language, cancellationToken);
        }

        var videoCallMatch = VideoCallRegex.Match(command);
        if (videoCallMatch.Success)
        {
            return await HandleCallAsync(userId, videoCallMatch.Groups["target"].Value, language, isVideo: true, cancellationToken);
        }

        var voiceCallMatch = VoiceCallRegex.Match(command);
        if (voiceCallMatch.Success)
        {
            return await HandleCallAsync(userId, voiceCallMatch.Groups["target"].Value, language, isVideo: false, cancellationToken);
        }

        if (CanUseOpenAi())
        {
            var modelResponse = await TryGenerateOpenAiResponseAsync(userId, request, language, cancellationToken);
            if (!string.IsNullOrWhiteSpace(modelResponse))
            {
                return new ClearAiResponseDto(modelResponse, "chat", true, null);
            }
        }

        return BuildFallbackChatResponse(language);
    }

    private async Task<ClearAiResponseDto> HandleSendMessageAsync(string userId, Match match, string language, CancellationToken cancellationToken)
    {
        var targetText = match.Groups["target"].Value.Trim();
        var content = match.Groups["content"].Value.Trim();
        var target = await ResolveFriendAsync(userId, targetText, cancellationToken);
        var conversation = await directConversationService.GetOrCreateAsync(
            userId,
            new StartDirectConversationRequest(target.Id),
            cancellationToken);

        await messageService.CreateDirectAsync(conversation.Id, userId, content, null, null, cancellationToken);

        var response = language == "vi"
            ? $"Mình đã gửi giúp bạn tới {target.DisplayName}: \"{content}\""
            : $"I sent that to {target.DisplayName} for you: \"{content}\"";

        return new ClearAiResponseDto(
            response,
            "send-message",
            false,
            new ClearAiActionDto("openDirectConversation", target.Id, target.DisplayName, conversation.Id, null, null));
    }

    private async Task<ClearAiResponseDto> HandleSendCurrentChannelMessageAsync(
        string userId,
        ClearAiRequest request,
        Match match,
        string language,
        CancellationToken cancellationToken)
    {
        if (!request.ChannelId.HasValue)
        {
            return new ClearAiResponseDto(
                language == "vi"
                    ? "MÃ¬nh cáº§n báº¡n má»Ÿ má»™t kÃªnh chat cá»¥ thá»ƒ trÆ°á»›c Ä‘á»ƒ gá»­i tin nháº¯n vÃ o kÃªnh."
                    : "Open a text channel first so I know where to send the message.",
                "send-channel-message",
                false,
                null);
        }

        var content = match.Groups["content"].Value.Trim();
        await messageService.CreateAsync(request.ChannelId.Value, userId, content, null, null, cancellationToken);

        var channelLabel = request.ChannelName ?? (language == "vi" ? "kÃªnh hiá»‡n táº¡i" : "the current channel");
        var response = language == "vi"
            ? $"MÃ¬nh Ä‘Ã£ gá»­i vÃ o #{channelLabel}: \"{content}\""
            : $"I sent this to #{channelLabel}: \"{content}\"";

        return new ClearAiResponseDto(response, "send-channel-message", false, null);
    }

    private ClearAiResponseDto HandleDraftCurrentChannelMessage(ClearAiRequest request, string language)
    {
        if (!request.ChannelId.HasValue)
        {
            return new ClearAiResponseDto(
                language == "vi"
                    ? "MÃ¬nh cáº§n báº¡n má»Ÿ má»™t kÃªnh chat cá»¥ thá»ƒ trÆ°á»›c Ä‘á»ƒ soáº¡n tin nháº¯n."
                    : "Open a text channel first so I know where to draft the message.",
                "compose-channel-message",
                false,
                null);
        }

        var channelLabel = request.ChannelName ?? (language == "vi" ? "kÃªnh hiá»‡n táº¡i" : "the current channel");
        var response = language == "vi"
            ? $"MÃ¬nh nghe ná»™i dung Ä‘á»ƒ gá»­i vÃ o #{channelLabel} Ä‘Ã¢y."
            : $"I'm listening for the message to #{channelLabel}.";

        return new ClearAiResponseDto(
            response,
            "compose-channel-message",
            false,
            new ClearAiActionDto("composeChannelMessage", null, channelLabel, request.ChannelId, request.ServerId, request.ChannelId));
    }

    private async Task<ClearAiResponseDto> HandleDraftNamedChannelMessageAsync(
        string userId,
        ClearAiRequest request,
        string channelText,
        string language,
        CancellationToken cancellationToken)
    {
        var channel = await ResolveTextChannelAsync(userId, request, channelText, cancellationToken);
        var response = language == "vi"
            ? $"MÃ¬nh nghe ná»™i dung Ä‘á»ƒ gá»­i vÃ o #{channel.Channel.Name} Ä‘Ã¢y."
            : $"I'm listening for the message to #{channel.Channel.Name}.";

        return new ClearAiResponseDto(
            response,
            "compose-channel-message",
            false,
            new ClearAiActionDto("composeChannelMessage", null, channel.Channel.Name, channel.Channel.Id, channel.Server.Id, channel.Channel.Id));
    }

    private async Task<ClearAiResponseDto> HandleSendNamedChannelMessageAsync(
        string userId,
        ClearAiRequest request,
        string channelText,
        string content,
        string language,
        CancellationToken cancellationToken)
    {
        var channel = await ResolveTextChannelAsync(userId, request, channelText, cancellationToken);
        await messageService.CreateAsync(channel.Channel.Id, userId, content, null, null, cancellationToken);

        var response = language == "vi"
            ? $"MÃ¬nh Ä‘Ã£ gá»­i vÃ o #{channel.Channel.Name}: \"{content}\""
            : $"I sent this to #{channel.Channel.Name}: \"{content}\"";

        return new ClearAiResponseDto(
            response,
            "send-channel-message",
            false,
            new ClearAiActionDto("openTextChannel", null, channel.Channel.Name, null, channel.Server.Id, channel.Channel.Id));
    }

    private async Task<ClearAiResponseDto> HandleReadMessagesFromNamedChannelAsync(
        string userId,
        ClearAiRequest request,
        string channelText,
        string? targetText,
        string language,
        bool latestOnly,
        CancellationToken cancellationToken)
    {
        var channel = await ResolveTextChannelAsync(userId, request, channelText, cancellationToken);
        var scopedRequest = request with
        {
            ServerId = channel.Server.Id,
            ServerName = channel.Server.Name,
            ChannelId = channel.Channel.Id,
            ChannelName = channel.Channel.Name,
            DirectConversationId = null,
            DirectConversationName = null,
            DirectConversationPeerUserId = null
        };

        var response = await HandleReadMessagesAsync(
            userId,
            scopedRequest,
            targetText,
            language,
            latestOnly,
            true,
            cancellationToken);

        return response with
        {
            Action = new ClearAiActionDto("openTextChannel", null, channel.Channel.Name, null, channel.Server.Id, channel.Channel.Id)
        };
    }

    private async Task<ClearAiResponseDto> HandleDraftSendMessageAsync(
        string userId,
        Match match,
        string language,
        CancellationToken cancellationToken)
    {
        var targetText = match.Groups["target"].Value.Trim();
        ApplicationUser? target = null;
        Guid? conversationId = null;

        if (!string.IsNullOrWhiteSpace(targetText))
        {
            target = await ResolveFriendAsync(userId, targetText, cancellationToken);
        }

        if (target is null)
        {
            return new ClearAiResponseDto(
                language == "vi"
                    ? "Bạn muốn mình gửi cho ai?"
                    : "Who should I send it to?",
                "compose-message-target-needed",
                false,
                null);
        }

        if (!conversationId.HasValue)
        {
            var conversation = await directConversationService.GetOrCreateAsync(
                userId,
                new StartDirectConversationRequest(target.Id),
                cancellationToken);
            conversationId = conversation.Id;
        }

        var response = language == "vi"
            ? $"Mình nghe nội dung gửi cho {target.DisplayName} đây."
            : $"I'm listening for the message to {target.DisplayName}.";

        return new ClearAiResponseDto(
            response,
            "compose-message",
            false,
            new ClearAiActionDto("composeDirectMessage", target.Id, target.DisplayName, conversationId, null, null));
    }

    private async Task<ClearAiResponseDto> HandleReadMessagesAsync(
        string userId,
        ClearAiRequest request,
        string? targetText,
        string language,
        bool latestOnly,
        bool preferCurrentChannel,
        CancellationToken cancellationToken)
    {
        IReadOnlyCollection<MessageDto> messages;
        string contextLabel;
        ClearAiActionDto? action = null;
        string? resolvedTargetName = null;
        string? resolvedTargetUserId = null;

        if (!string.IsNullOrWhiteSpace(targetText) && preferCurrentChannel && request.ChannelId.HasValue)
        {
            messages = await messageService.GetChannelMessagesAsync(request.ChannelId.Value, userId, 1, 50, cancellationToken);
            contextLabel = request.ChannelName ?? (language == "vi" ? "kÃªnh hiá»‡n táº¡i" : "the current channel");
            resolvedTargetName = targetText;
        }
        else if (!string.IsNullOrWhiteSpace(targetText))
        {
            var target = await ResolveFriendAsync(userId, targetText, cancellationToken);
            var conversationId = request.DirectConversationPeerUserId == target.Id && request.DirectConversationId.HasValue
                ? request.DirectConversationId.Value
                : (await directConversationService.GetOrCreateAsync(
                    userId,
                    new StartDirectConversationRequest(target.Id),
                    cancellationToken)).Id;

            messages = await messageService.GetDirectConversationMessagesAsync(conversationId, userId, 1, 20, cancellationToken);
            contextLabel = language == "vi"
                ? $"cuộc trò chuyện với {target.DisplayName}"
                : $"the conversation with {target.DisplayName}";
            resolvedTargetName = target.DisplayName;
            resolvedTargetUserId = target.Id;
            action = new ClearAiActionDto("openDirectConversation", target.Id, target.DisplayName, conversationId, null, null);
        }
        else if (request.DirectConversationId.HasValue)
        {
            messages = await messageService.GetDirectConversationMessagesAsync(request.DirectConversationId.Value, userId, 1, 20, cancellationToken);
            contextLabel = request.DirectConversationName ?? (language == "vi" ? "cuộc trò chuyện hiện tại" : "the current conversation");
        }
        else if (request.ChannelId.HasValue)
        {
            messages = await messageService.GetChannelMessagesAsync(request.ChannelId.Value, userId, 1, 20, cancellationToken);
            contextLabel = request.ChannelName ?? (language == "vi" ? "kênh hiện tại" : "the current channel");
        }
        else
        {
            return new ClearAiResponseDto(
                language == "vi"
                    ? "Mình chưa có ngữ cảnh chat cụ thể để đọc tin nhắn. Hãy mở một cuộc trò chuyện hoặc nói rõ tên người bạn muốn mình đọc."
                    : "I do not have a specific conversation to read yet. Open a chat or tell me whose messages you want me to read.",
                "read-messages",
                false,
                null);
        }

        var visibleMessages = messages
            .Where(message => !message.IsDeleted)
            .ToArray();

        if (!string.IsNullOrWhiteSpace(targetText))
        {
            visibleMessages = visibleMessages
                .Where(message => SenderMatchesLookup(message.Sender, resolvedTargetUserId ?? targetText))
                .ToArray();
        }

        var takeCount = latestOnly ? 1 : 5;
        var recentMessages = visibleMessages
            .OrderByDescending(message => message.CreatedAt)
            .Take(takeCount)
            .OrderBy(message => message.CreatedAt)
            .ToArray();

        if (recentMessages.Length == 0)
        {
            var emptyMessage = !string.IsNullOrWhiteSpace(targetText)
                ? language == "vi"
                    ? $"Mình chưa thấy tin nhắn gần đây từ {resolvedTargetName ?? targetText} trong {contextLabel}."
                    : $"I could not find any recent messages from {resolvedTargetName ?? targetText} in {contextLabel}."
                : language == "vi"
                    ? $"Hiện chưa có tin nhắn nào trong {contextLabel} để mình đọc."
                    : $"There are no messages in {contextLabel} for me to read yet.";

            return new ClearAiResponseDto(emptyMessage, "read-messages", false, action);
        }

        var builder = new StringBuilder();
        if (!string.IsNullOrWhiteSpace(targetText))
        {
            builder.AppendLine(
                latestOnly
                    ? language == "vi"
                        ? $"Mình đọc tin nhắn mới nhất từ {resolvedTargetName ?? targetText} trong {contextLabel}:"
                        : $"Here is the latest message from {resolvedTargetName ?? targetText} in {contextLabel}:"
                    : language == "vi"
                        ? $"Mình đọc được {recentMessages.Length} tin nhắn gần nhất từ {resolvedTargetName ?? targetText} trong {contextLabel}:"
                        : $"Here are the latest {recentMessages.Length} messages from {resolvedTargetName ?? targetText} in {contextLabel}:");
        }
        else
        {
            builder.AppendLine(
                latestOnly
                    ? language == "vi"
                        ? $"Mình đọc tin nhắn mới nhất trong {contextLabel}:"
                        : $"Here is the latest message in {contextLabel}:"
                    : language == "vi"
                        ? $"Mình đọc {recentMessages.Length} tin nhắn gần nhất trong {contextLabel}:"
                        : $"Here are the latest {recentMessages.Length} messages in {contextLabel}:");
        }

        foreach (var message in recentMessages)
        {
            var content = string.IsNullOrWhiteSpace(message.Content)
                ? language == "vi" ? "[tệp đính kèm]" : "[attachment]"
                : message.Content;

            builder.AppendLine($"- {message.Sender.DisplayName}: {content}");
        }

        return new ClearAiResponseDto(builder.ToString().Trim(), "read-messages", false, action);
    }

    private async Task<ClearAiResponseDto> HandleLatestMessageSenderAsync(
        string userId,
        ClearAiRequest request,
        string language,
        CancellationToken cancellationToken)
    {
        var notifications = await notificationRepository.GetForUserAsync(userId, cancellationToken);
        var latestMessageNotification = notifications
            .Where(notification => notification.Type == NotificationType.Message && !IsCallNotification(notification.Title, notification.Content))
            .OrderByDescending(notification => notification.CreatedAt)
            .FirstOrDefault();

        if (latestMessageNotification is not null)
        {
            var notificationMessage = await TryGetLatestMessageFromNotificationAsync(userId, latestMessageNotification, cancellationToken);
            if (notificationMessage is not null)
            {
                return new ClearAiResponseDto(
                    BuildLatestMessageReadback(
                        language,
                        notificationMessage.Sender.DisplayName,
                        notificationMessage.Content,
                        notificationMessage.Attachments.Count > 0),
                    "latest-message-sender",
                    false,
                    null);
            }

            var senderName = ExtractSenderNameFromNotification(latestMessageNotification.Title, latestMessageNotification.Content);
            if (!string.IsNullOrWhiteSpace(senderName))
            {
                var preview = ExtractMessagePreviewFromNotification(
                    latestMessageNotification.Title,
                    latestMessageNotification.Content);
                var hasAttachmentOnly = IsAttachmentNotificationPreview(preview);

                return new ClearAiResponseDto(
                    BuildLatestMessageReadback(
                        language,
                        senderName,
                        hasAttachmentOnly ? null : preview,
                        hasAttachmentOnly),
                    "latest-message-sender",
                    false,
                    null);

            }
        }

        MessageDto? latestMessage = null;

        if (request.DirectConversationId.HasValue)
        {
            latestMessage = (await messageService.GetDirectConversationMessagesAsync(
                    request.DirectConversationId.Value,
                    userId,
                    1,
                    10,
                    cancellationToken))
                .Where(message => !message.IsDeleted)
                .OrderByDescending(message => message.CreatedAt)
                .FirstOrDefault();
        }
        else if (request.ChannelId.HasValue)
        {
            latestMessage = (await messageService.GetChannelMessagesAsync(
                    request.ChannelId.Value,
                    userId,
                    1,
                    10,
                    cancellationToken))
                .Where(message => !message.IsDeleted)
                .OrderByDescending(message => message.CreatedAt)
                .FirstOrDefault();
        }

        if (latestMessage is not null)
        {
            return new ClearAiResponseDto(
                BuildLatestMessageReadback(
                    language,
                    latestMessage.Sender.DisplayName,
                    latestMessage.Content,
                    latestMessage.Attachments.Count > 0),
                "latest-message-sender",
                false,
                null);

        }

        return new ClearAiResponseDto(
            language == "vi"
                ? "Hiện mình chưa thấy tin nhắn mới nào để đọc tên người gửi."
                : "I cannot find a recent message sender to report right now.",
            "latest-message-sender",
            false,
            null);
    }

    private async Task<ClearAiResponseDto> HandleCallAsync(
        string userId,
        string targetText,
        string language,
        bool isVideo,
        CancellationToken cancellationToken)
    {
        var target = await ResolveFriendAsync(userId, targetText, cancellationToken);
        var conversation = await directConversationService.GetOrCreateAsync(
            userId,
            new StartDirectConversationRequest(target.Id),
            cancellationToken);

        var response = language == "vi"
            ? isVideo
                ? $"Mình đã chuẩn bị video call với {target.DisplayName}. Đang mở cuộc gọi riêng."
                : $"Mình đã chuẩn bị voice call với {target.DisplayName}. Đang mở cuộc gọi riêng."
            : isVideo
                ? $"I prepared a video call with {target.DisplayName}. Opening the direct call now."
                : $"I prepared a voice call with {target.DisplayName}. Opening the direct call now.";

        return new ClearAiResponseDto(
            response,
            isVideo ? "video-call" : "voice-call",
            false,
            new ClearAiActionDto(isVideo ? "startVideoCall" : "startDirectCall", target.Id, target.DisplayName, conversation.Id, null, null));
    }

    private async Task<ChannelLookupCandidate> ResolveTextChannelAsync(
        string userId,
        ClearAiRequest request,
        string channelText,
        CancellationToken cancellationToken)
    {
        var accessibleServers = await serverRepository.GetForUserAsync(userId, cancellationToken);
        var orderedServers = accessibleServers
            .OrderByDescending(server => request.ServerId.HasValue && server.Id == request.ServerId.Value)
            .ThenBy(server => server.Name, StringComparer.OrdinalIgnoreCase)
            .ToArray();

        var candidates = new List<ChannelLookupCandidate>();
        foreach (var server in orderedServers)
        {
            if (!await permissionService.HasPermissionAsync(server.Id, userId, PermissionType.ViewChannels, cancellationToken))
            {
                continue;
            }

            var channels = await channelRepository.GetByServerAsync(server.Id, cancellationToken);
            candidates.AddRange(
                channels
                    .Where(channel => channel.Type == ChannelType.Text)
                    .Select(channel => new ChannelLookupCandidate(
                        server,
                        channel,
                        NormalizeFriendLookup(server.Name),
                        NormalizeFriendLookup(channel.Name),
                        CompactLookup(server.Name),
                        CompactLookup(channel.Name))));
        }

        if (candidates.Count == 0)
        {
            throw new ApiException("No accessible text channels were found.");
        }

        var normalizedTarget = NormalizeFriendLookup(channelText);
        var compactTarget = CompactLookup(channelText);

        var exactMatches = candidates
            .Where(candidate =>
                candidate.ChannelName == normalizedTarget ||
                candidate.ChannelNameCompact == compactTarget)
            .ToArray();

        if (exactMatches.Length == 1)
        {
            return exactMatches[0];
        }

        if (exactMatches.Length > 1)
        {
            throw new ApiException($"Multiple channels matched '{channelText}': {string.Join(", ", exactMatches.Select(candidate => $"#{candidate.Channel.Name} in {candidate.Server.Name}"))}.");
        }

        var partialMatches = candidates
            .Where(candidate =>
                candidate.ChannelName.Contains(normalizedTarget, StringComparison.Ordinal) ||
                candidate.ChannelNameCompact.Contains(compactTarget, StringComparison.Ordinal))
            .ToArray();

        if (partialMatches.Length == 1)
        {
            return partialMatches[0];
        }

        if (partialMatches.Length > 1)
        {
            throw new ApiException($"Multiple channels matched '{channelText}': {string.Join(", ", partialMatches.Select(candidate => $"#{candidate.Channel.Name} in {candidate.Server.Name}"))}.");
        }

        var fuzzyMatches = candidates
            .Select(candidate => new
            {
                Candidate = candidate,
                Distance = MinLookupDistance(
                    normalizedTarget,
                    compactTarget,
                    candidate.ChannelName,
                    candidate.ChannelNameCompact)
            })
            .Where(candidate => candidate.Distance <= GetAllowedLookupDistance(compactTarget))
            .OrderBy(candidate => candidate.Distance)
            .ThenByDescending(candidate => request.ServerId.HasValue && candidate.Candidate.Server.Id == request.ServerId.Value)
            .ThenBy(candidate => candidate.Candidate.Server.Name, StringComparer.OrdinalIgnoreCase)
            .ToArray();

        if (fuzzyMatches.Length > 0)
        {
            var bestDistance = fuzzyMatches[0].Distance;
            var bestMatches = fuzzyMatches
                .Where(candidate => candidate.Distance == bestDistance)
                .Select(candidate => candidate.Candidate)
                .ToArray();

            if (bestMatches.Length == 1)
            {
                return bestMatches[0];
            }

            throw new ApiException($"Multiple channels matched '{channelText}': {string.Join(", ", bestMatches.Select(candidate => $"#{candidate.Channel.Name} in {candidate.Server.Name}"))}.");
        }

        throw new ApiException($"No accessible text channel matched '{channelText}'.");
    }

    private async Task<ApplicationUser> ResolveFriendAsync(string userId, string targetText, CancellationToken cancellationToken)
    {
        var acceptedFriends = await friendRepository.GetAcceptedForUserAsync(userId, cancellationToken);
        var candidates = acceptedFriends
            .Select(friendship => friendship.RequesterId == userId ? friendship.Addressee : friendship.Requester)
            .DistinctBy(user => user.Id)
            .ToArray();

        var normalizedTarget = NormalizeFriendLookup(targetText);
        var compactTarget = CompactLookup(targetText);
        var indexedCandidates = candidates
            .Select(user => new FriendLookupCandidate(
                user,
                NormalizeFriendLookup(user.DisplayName),
                NormalizeFriendLookup(user.UserName ?? string.Empty),
                CompactLookup(user.DisplayName),
                CompactLookup(user.UserName ?? string.Empty)))
            .ToArray();

        var exactMatches = indexedCandidates
            .Where(candidate =>
                candidate.DisplayName == normalizedTarget ||
                candidate.UserName == normalizedTarget ||
                candidate.DisplayNameCompact == compactTarget ||
                candidate.UserNameCompact == compactTarget)
            .Select(candidate => candidate.User)
            .DistinctBy(user => user.Id)
            .ToArray();

        if (exactMatches.Length == 1)
        {
            return exactMatches[0];
        }

        if (exactMatches.Length > 1)
        {
            throw new ApiException($"Multiple friends matched '{targetText}': {string.Join(", ", exactMatches.Select(user => user.DisplayName))}.");
        }

        var partialMatches = indexedCandidates
            .Where(candidate =>
                candidate.DisplayName.Contains(normalizedTarget, StringComparison.Ordinal) ||
                candidate.UserName.Contains(normalizedTarget, StringComparison.Ordinal) ||
                candidate.DisplayNameCompact.Contains(compactTarget, StringComparison.Ordinal) ||
                candidate.UserNameCompact.Contains(compactTarget, StringComparison.Ordinal))
            .Select(candidate => candidate.User)
            .DistinctBy(user => user.Id)
            .ToArray();

        if (partialMatches.Length == 1)
        {
            return partialMatches[0];
        }

        if (partialMatches.Length > 1)
        {
            throw new ApiException($"Multiple friends matched '{targetText}': {string.Join(", ", partialMatches.Select(user => user.DisplayName))}.");
        }

        var fuzzyMatches = indexedCandidates
            .Select(candidate => new
            {
                candidate.User,
                Distance = MinLookupDistance(
                    normalizedTarget,
                    compactTarget,
                    candidate.DisplayName,
                    candidate.UserName,
                    candidate.DisplayNameCompact,
                    candidate.UserNameCompact)
            })
            .Where(candidate => candidate.Distance <= GetAllowedLookupDistance(compactTarget))
            .OrderBy(candidate => candidate.Distance)
            .ThenBy(candidate => candidate.User.DisplayName, StringComparer.Ordinal)
            .ToArray();

        if (fuzzyMatches.Length > 0)
        {
            var bestDistance = fuzzyMatches[0].Distance;
            var bestMatches = fuzzyMatches
                .Where(candidate => candidate.Distance == bestDistance)
                .Select(candidate => candidate.User)
                .DistinctBy(user => user.Id)
                .ToArray();

            if (bestMatches.Length == 1)
            {
                return bestMatches[0];
            }

            throw new ApiException($"Multiple friends matched '{targetText}': {string.Join(", ", bestMatches.Select(user => user.DisplayName))}.");
        }

        throw new ApiException($"No accepted friend matched '{targetText}'.");
    }

    private static bool WantsLatestMessageSender(string command)
    {
        var normalized = NormalizeCommandForParsing(command);
        return normalized is
            "doc thong bao moi nhat" or
            "doc thong bao moi" or
            "thong bao moi nhat" or
            "thong bao moi" or
            "doc tin nhan moi nhat" or
            "ai moi gui tin nhan" or
            "ai vua gui tin nhan" or
            "nguoi nao moi gui tin nhan" or
            "nguoi nao vua gui tin nhan" or
            "read latest notification" or
            "read newest notification" or
            "latest notification" or
            "who just sent a message" or
            "who just messaged me" or
            "who sent the latest message" or
            "who sent me a message";
    }

    private static bool TryParseNamedChannelSendCommand(string normalizedCommand, out string? channelText, out string? content, out bool isDraft)
    {
        channelText = null;
        content = null;
        isDraft = false;

        var prefixes = new[]
        {
            "gui tin nhan vao kenh chat ",
            "gui tin nhan trong kenh chat ",
            "gui tin nhan vao kenh ",
            "gui tin nhan trong kenh ",
            "gui vao kenh chat ",
            "gui vao kenh ",
            "send message to channel ",
            "send to channel "
        };

        var prefix = prefixes.FirstOrDefault(normalizedCommand.StartsWith);
        if (prefix is null)
        {
            return false;
        }

        var remaining = normalizedCommand[prefix.Length..].Trim();
        if (string.IsNullOrWhiteSpace(remaining))
        {
            return false;
        }

        foreach (var separator in new[] { " rang ", " la ", " that ", " saying ", ":" })
        {
            var separatorIndex = remaining.IndexOf(separator, StringComparison.Ordinal);
            if (separatorIndex < 0)
            {
                continue;
            }

            channelText = remaining[..separatorIndex].Trim();
            content = remaining[(separatorIndex + separator.Length)..].Trim();
            return !string.IsNullOrWhiteSpace(channelText) &&
                   !string.IsNullOrWhiteSpace(content) &&
                   !IsCurrentChannelAlias(channelText);
        }

        if (IsCurrentChannelAlias(remaining))
        {
            return false;
        }

        channelText = remaining;
        isDraft = true;
        return true;
    }

    private static bool TryParseNamedChannelReadCommand(string normalizedCommand, out string? channelText, out string? targetText, out bool latestOnly)
    {
        channelText = null;
        targetText = null;
        latestOnly = WantsLatestMessageOnly(normalizedCommand);

        if (!LooksLikeReadMessagesCommand(normalizedCommand))
        {
            return false;
        }

        foreach (var marker in new[] { " trong kenh chat ", " trong kenh ", " trong channel ", " in channel " })
        {
            var markerIndex = normalizedCommand.IndexOf(marker, StringComparison.Ordinal);
            if (markerIndex < 0)
            {
                continue;
            }

            var parsedChannel = normalizedCommand[(markerIndex + marker.Length)..].Trim();
            if (string.IsNullOrWhiteSpace(parsedChannel) || IsCurrentChannelAlias(parsedChannel))
            {
                return false;
            }

            var scopedCommand = normalizedCommand[..markerIndex].Trim();
            channelText = parsedChannel;
            targetText = ExtractReadTargetFromNormalizedCommand(scopedCommand);
            return true;
        }

        return false;
    }

    private static bool TryParseReadMessagesCommand(string command, out string? targetText, out bool latestOnly)
    {
        targetText = null;
        var normalized = NormalizeCommandForParsing(command);
        latestOnly = normalized.Contains("moi nhat", StringComparison.Ordinal) ||
                     normalized.Contains("gan nhat", StringComparison.Ordinal) ||
                     normalized.Contains("latest", StringComparison.Ordinal) ||
                     normalized.Contains("newest", StringComparison.Ordinal);

        if (normalized.StartsWith("read ", StringComparison.Ordinal) &&
            normalized.EndsWith("'s messages", StringComparison.Ordinal))
        {
            var target = normalized["read ".Length..^"'s messages".Length].Trim();
            targetText = string.IsNullOrWhiteSpace(target) ? null : target;
            return true;
        }

        if (normalized.StartsWith("read ", StringComparison.Ordinal) &&
            normalized.EndsWith("'s latest messages", StringComparison.Ordinal))
        {
            var target = normalized["read ".Length..^"'s latest messages".Length].Trim();
            targetText = string.IsNullOrWhiteSpace(target) ? null : target;
            latestOnly = true;
            return true;
        }

        var looksLikeReadCommand =
            normalized.Contains("doc tin nhan", StringComparison.Ordinal) ||
            normalized.Contains("read messages", StringComparison.Ordinal) ||
            normalized.Contains("read message", StringComparison.Ordinal);

        if (!looksLikeReadCommand)
        {
            return normalized is "read this chat" or "read this conversation";
        }

        foreach (var separator in new[] { " cua ", " tu ", " from " })
        {
            var separatorIndex = normalized.IndexOf(separator, StringComparison.Ordinal);
            if (separatorIndex < 0)
            {
                continue;
            }

            var parsedTarget = normalized[(separatorIndex + separator.Length)..].Trim();
            targetText = string.IsNullOrWhiteSpace(parsedTarget) ? null : parsedTarget;
            return true;
        }

        return true;
    }

    private static bool LooksLikeReadMessagesCommand(string normalizedCommand)
    {
        return normalizedCommand.Contains("doc tin nhan", StringComparison.Ordinal) ||
               normalizedCommand.Contains("read messages", StringComparison.Ordinal) ||
               normalizedCommand.Contains("read message", StringComparison.Ordinal) ||
               normalizedCommand is "read this chat" or "read this conversation";
    }

    private static string? ExtractReadTargetFromNormalizedCommand(string normalizedCommand)
    {
        foreach (var separator in new[] { " cua ", " tu ", " from " })
        {
            var separatorIndex = normalizedCommand.IndexOf(separator, StringComparison.Ordinal);
            if (separatorIndex < 0)
            {
                continue;
            }

            var parsedTarget = StripCurrentChannelSuffix(normalizedCommand[(separatorIndex + separator.Length)..].Trim());
            return string.IsNullOrWhiteSpace(parsedTarget) ? null : parsedTarget;
        }

        if (normalizedCommand.StartsWith("read ", StringComparison.Ordinal) &&
            normalizedCommand.EndsWith("'s messages", StringComparison.Ordinal))
        {
            var target = StripCurrentChannelSuffix(normalizedCommand["read ".Length..^"'s messages".Length].Trim());
            return string.IsNullOrWhiteSpace(target) ? null : target;
        }

        if (normalizedCommand.StartsWith("read ", StringComparison.Ordinal) &&
            normalizedCommand.EndsWith("'s latest messages", StringComparison.Ordinal))
        {
            var target = StripCurrentChannelSuffix(normalizedCommand["read ".Length..^"'s latest messages".Length].Trim());
            return string.IsNullOrWhiteSpace(target) ? null : target;
        }

        return null;
    }

    private static bool RefersToCurrentChannel(string normalizedCommand)
    {
        return normalizedCommand.Contains("trong kenh", StringComparison.Ordinal) ||
               normalizedCommand.Contains("trong chat", StringComparison.Ordinal) ||
               normalizedCommand.Contains("trong channel", StringComparison.Ordinal) ||
               normalizedCommand.Contains("kenh nay", StringComparison.Ordinal) ||
               normalizedCommand.Contains("chat nay", StringComparison.Ordinal) ||
               normalizedCommand.Contains("channel nay", StringComparison.Ordinal) ||
               normalizedCommand.Contains("kenh hien tai", StringComparison.Ordinal) ||
               normalizedCommand.Contains("chat hien tai", StringComparison.Ordinal) ||
               normalizedCommand.Contains("channel hien tai", StringComparison.Ordinal) ||
               normalizedCommand.Contains("this channel", StringComparison.Ordinal) ||
               normalizedCommand.Contains("current channel", StringComparison.Ordinal) ||
               normalizedCommand.Contains("this chat", StringComparison.Ordinal) ||
               normalizedCommand.Contains("current chat", StringComparison.Ordinal);
    }

    private static bool IsCurrentChannelAlias(string channelText)
    {
        return channelText is
            "nay" or
            "hien tai" or
            "kenh nay" or
            "kenh chat nay" or
            "channel nay" or
            "chat nay" or
            "kenh hien tai" or
            "kenh chat hien tai" or
            "channel hien tai" or
            "chat hien tai" or
            "this channel" or
            "current channel" or
            "this chat" or
            "current chat";
    }

    private static string StripCurrentChannelSuffix(string targetText)
    {
        var suffixes = new[]
        {
            " trong kenh chat hien tai",
            " trong kenh hien tai",
            " trong channel hien tai",
            " trong chat hien tai",
            " trong kenh chat nay",
            " trong kenh nay",
            " trong channel nay",
            " trong chat nay",
            " in this channel",
            " in current channel",
            " in this chat",
            " in current chat"
        };

        foreach (var suffix in suffixes)
        {
            if (targetText.EndsWith(suffix, StringComparison.Ordinal))
            {
                return targetText[..^suffix.Length].Trim();
            }
        }

        return targetText;
    }

    private static bool WantsLatestMessageOnly(string command)
    {
        var normalized = NormalizeCommandForParsing(command);
        return normalized.Contains("moi nhat", StringComparison.Ordinal) ||
               normalized.Contains("gan nhat", StringComparison.Ordinal) ||
               normalized.Contains("latest", StringComparison.Ordinal) ||
               normalized.Contains("newest", StringComparison.Ordinal);
    }

    private static string NormalizeCommandForParsing(string value)
    {
        var normalized = NormalizeLookup(value);
        normalized = Regex.Replace(normalized, @"[^\p{L}\p{N}\s']", " ");
        normalized = Regex.Replace(normalized, @"\s+", " ").Trim();
        return normalized;
    }

    private static bool SenderMatchesLookup(UserSummaryDto sender, string targetText)
    {
        if (string.Equals(sender.Id, targetText, StringComparison.Ordinal))
        {
            return true;
        }

        var normalizedTarget = NormalizeLookup(targetText);
        if (string.IsNullOrWhiteSpace(normalizedTarget))
        {
            return false;
        }

        var softTarget = NormalizeFriendLookup(targetText);
        var compactTarget = CompactLookup(targetText);
        var normalizedDisplayName = NormalizeFriendLookup(sender.DisplayName);
        var normalizedUserName = NormalizeFriendLookup(sender.UserName);
        var compactDisplayName = CompactLookup(sender.DisplayName);
        var compactUserName = CompactLookup(sender.UserName);
        return normalizedDisplayName == normalizedTarget ||
               normalizedDisplayName == softTarget ||
               normalizedUserName == normalizedTarget ||
               normalizedUserName == softTarget ||
               normalizedDisplayName.Contains(normalizedTarget, StringComparison.Ordinal) ||
               normalizedDisplayName.Contains(softTarget, StringComparison.Ordinal) ||
               normalizedUserName.Contains(normalizedTarget, StringComparison.Ordinal) ||
               normalizedUserName.Contains(softTarget, StringComparison.Ordinal) ||
               compactDisplayName == compactTarget ||
               compactUserName == compactTarget;
    }

    private static bool IsCallNotification(string title, string content)
    {
        var normalizedTitle = NormalizeLookup(title);
        var normalizedContent = NormalizeLookup(content);
        return normalizedTitle.Contains("call", StringComparison.Ordinal) ||
               normalizedTitle.Contains("cuoc goi", StringComparison.Ordinal) ||
               normalizedContent.Contains("join the call", StringComparison.Ordinal) ||
               normalizedContent.Contains("tham gia cuoc goi", StringComparison.Ordinal);
    }

    private static string? ExtractSenderNameFromNotification(string title, string content)
    {
        foreach (var prefix in new[]
                 {
                     "New direct message from ",
                     "Tin nhắn trực tiếp mới từ ",
                     "Tin nhan truc tiep moi tu "
                 })
        {
            if (title.StartsWith(prefix, StringComparison.OrdinalIgnoreCase))
            {
                return title[prefix.Length..].Trim();
            }
        }

        var colonIndex = content.IndexOf(':', StringComparison.Ordinal);
        if (colonIndex > 0)
        {
            return content[..colonIndex].Trim();
        }

        return null;
    }

    private static string? ExtractMessagePreviewFromNotification(string title, string content)
    {
        if (string.IsNullOrWhiteSpace(content))
        {
            return null;
        }

        var senderName = ExtractSenderNameFromNotification(title, content);
        if (!string.IsNullOrWhiteSpace(senderName) &&
            content.StartsWith($"{senderName}:", StringComparison.OrdinalIgnoreCase))
        {
            return content[(senderName.Length + 1)..].Trim();
        }

        return content.Trim();
    }

    private async Task<MessageDto?> TryGetLatestMessageFromNotificationAsync(
        string userId,
        UserNotification notification,
        CancellationToken cancellationToken)
    {
        if (!Guid.TryParse(notification.RelatedEntityId, out var relatedId))
        {
            return null;
        }

        if (string.Equals(notification.RelatedEntityType, nameof(DirectConversation), StringComparison.Ordinal))
        {
            return (await messageService.GetDirectConversationMessagesAsync(
                    relatedId,
                    userId,
                    1,
                    10,
                    cancellationToken))
                .Where(message => !message.IsDeleted)
                .OrderByDescending(message => message.CreatedAt)
                .FirstOrDefault();
        }

        if (string.Equals(notification.RelatedEntityType, nameof(Channel), StringComparison.Ordinal))
        {
            return (await messageService.GetChannelMessagesAsync(
                    relatedId,
                    userId,
                    1,
                    10,
                    cancellationToken))
                .Where(message => !message.IsDeleted)
                .OrderByDescending(message => message.CreatedAt)
                .FirstOrDefault();
        }

        return null;
    }

    private static bool IsAttachmentNotificationPreview(string? preview)
    {
        if (string.IsNullOrWhiteSpace(preview))
        {
            return false;
        }

        return string.Equals(preview.Trim(), "sent an attachment.", StringComparison.OrdinalIgnoreCase) ||
               string.Equals(preview.Trim(), "đã gửi một tệp đính kèm.", StringComparison.OrdinalIgnoreCase);
    }

    private static string BuildLatestMessageReadback(string language, string senderName, string? messageContent, bool hasAttachments = false)
    {
        var preview = string.IsNullOrWhiteSpace(messageContent)
            ? hasAttachments
                ? (language == "vi" ? "đã gửi một tệp đính kèm." : "sent an attachment.")
                : (language == "vi" ? "đã gửi một tin nhắn mới." : "sent a new message.")
            : messageContent.Trim();

        return $"{senderName}: {preview}";
    }

    private bool CanUseOpenAi()
    {
        return string.Equals(settings.Provider, "openai", StringComparison.OrdinalIgnoreCase)
            && !string.IsNullOrWhiteSpace(settings.ApiKey);
    }

    private async Task<string?> TryGenerateOpenAiResponseAsync(string userId, ClearAiRequest request, string language, CancellationToken cancellationToken)
    {
        var client = httpClientFactory.CreateClient();
        client.BaseAddress = new Uri(settings.BaseUrl.TrimEnd('/') + "/");
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", settings.ApiKey);

        var scopeSummary = BuildScopeSummary(request, language);

        var payload = new
        {
            model = settings.Model,
            temperature = 0.7,
            messages = new object[]
            {
                new
                {
                    role = "system",
                    content = language == "vi"
                        ? $"Bạn là {settings.AssistantName}, trợ lý AI của ClearCord. Trả lời ngắn gọn, thân thiện, thực tế. Nếu người dùng hỏi vượt khả năng hiện tại, hãy hướng họ dùng các lệnh hỗ trợ sẵn."
                        : $"You are {settings.AssistantName}, the ClearCord AI assistant. Reply briefly, warmly, and practically. If a request is outside your current built-in actions, guide the user toward supported commands."
                },
                new
                {
                    role = "user",
                    content =
                        $"Prompt: {request.Prompt}\n" +
                        $"Language: {language}\n" +
                        $"Current scope: {scopeSummary}\n" +
                        "Supported commands include reading recent messages, reading the latest message, sending a direct message to a friend, and opening direct calls."
                }
            }
        };

        using var response = await client.PostAsJsonAsync("chat/completions", payload, cancellationToken);
        if (!response.IsSuccessStatusCode)
        {
            return null;
        }

        await using var responseStream = await response.Content.ReadAsStreamAsync(cancellationToken);
        using var document = await JsonDocument.ParseAsync(responseStream, cancellationToken: cancellationToken);
        return document.RootElement
            .GetProperty("choices")[0]
            .GetProperty("message")
            .GetProperty("content")
            .GetString();
    }

    private static string BuildScopeSummary(ClearAiRequest request, string language)
    {
        if (request.DirectConversationId.HasValue)
        {
            return language == "vi"
                ? $"Direct message với {request.DirectConversationName ?? "người dùng"}"
                : $"Direct message with {request.DirectConversationName ?? "a user"}";
        }

        if (request.ChannelId.HasValue)
        {
            return language == "vi"
                ? $"Kênh {request.ChannelName ?? "hiện tại"} trong server {request.ServerName ?? "hiện tại"}"
                : $"Channel {request.ChannelName ?? "current"} in server {request.ServerName ?? "current"}";
        }

        return language == "vi" ? "Không có ngữ cảnh cụ thể" : "No specific scope";
    }

    private static ClearAiResponseDto BuildHelpResponse(string language)
    {
        var message = language == "vi"
            ? "Mình là Clear AI. Bạn có thể nói: \"Hey Clear đọc tin nhắn của Huy\", \"Hey Clear đọc tin nhắn mới nhất của Huy\", \"Hey Clear nhắn cho Minh: mình đến sau 10 phút\", hoặc \"Hey Clear gọi cho Lan\"."
            : "I am Clear AI. Try: \"Hey Clear read Alex's messages\", \"Hey Clear read Alex's latest message\", \"Hey Clear send a message to Sam: I will be 10 minutes late\", or \"Hey Clear call Alex\".";

        return new ClearAiResponseDto(message, "help", false, null);
    }

    private static ClearAiResponseDto BuildFallbackChatResponse(string language)
    {
        var message = language == "vi"
            ? "Mình đã hiểu yêu cầu nhưng hiện trong bản MVP này mình hỗ trợ tốt nhất các lệnh đọc tin nhắn gần đây, đọc tin nhắn mới nhất, gửi DM cho bạn bè, và mở voice/video call."
            : "I understood the request, but in this MVP I work best with reading recent messages, reading the latest message, sending direct messages to friends, and opening voice or video calls.";

        return new ClearAiResponseDto(message, "fallback", false, null);
    }

    private static string StripWakePhrase(string prompt, string assistantName)
    {
        var trimmed = prompt.Trim();
        var lower = trimmed.ToLowerInvariant();
        var wakePhrases = new[]
        {
            $"hey {assistantName.ToLowerInvariant()}",
            assistantName.ToLowerInvariant()
        };

        foreach (var wakePhrase in wakePhrases)
        {
            if (!lower.StartsWith(wakePhrase, StringComparison.Ordinal))
            {
                continue;
            }

            return trimmed[wakePhrase.Length..].Trim(' ', ',', ':', '-', '!');
        }

        return trimmed;
    }

    private static string StripVoiceCommandTerminator(string command)
    {
        return Regex.Replace(
                command.Trim(),
                @"(?:\s+|^)(?:kết\s*thúc|ket\s*thuc|xong|gửi\s*đi|gui\s*di|send\s+it|finish)[\s\.\,\!\?]*$",
                string.Empty,
                RegexOptions.IgnoreCase | RegexOptions.CultureInvariant)
            .Trim();
    }

    private static string ResolveLanguage(string? requestedLanguage, string prompt)
    {
        if (requestedLanguage is "vi" or "en")
        {
            return requestedLanguage;
        }

        return prompt.Any(character =>
                character is 'ă' or 'â' or 'ê' or 'ô' or 'ơ' or 'ư' or 'đ' or
                'á' or 'à' or 'ả' or 'ã' or 'ạ' or
                'í' or 'ì' or 'ỉ' or 'ĩ' or 'ị' or
                'ó' or 'ò' or 'ỏ' or 'õ' or 'ọ' or
                'ú' or 'ù' or 'ủ' or 'ũ' or 'ụ')
            ? "vi"
            : "en";
    }

    private sealed record FriendLookupCandidate(
        ApplicationUser User,
        string DisplayName,
        string UserName,
        string DisplayNameCompact,
        string UserNameCompact);

    private sealed record ChannelLookupCandidate(
        Server Server,
        Channel Channel,
        string ServerName,
        string ChannelName,
        string ServerNameCompact,
        string ChannelNameCompact);

    private static string NormalizeLookup(string value)
    {
        var normalized = value.Trim().Normalize(NormalizationForm.FormD);
        var builder = new StringBuilder(normalized.Length);

        foreach (var character in normalized)
        {
            var category = CharUnicodeInfo.GetUnicodeCategory(character);
            if (category == UnicodeCategory.NonSpacingMark)
            {
                continue;
            }

            builder.Append(character is 'đ' or 'Đ' ? 'd' : char.ToLowerInvariant(character));
        }

        return builder.ToString().Normalize(NormalizationForm.FormC);
    }

    private static string NormalizeFriendLookup(string value)
    {
        var normalized = NormalizeLookup(value);
        normalized = Regex.Replace(normalized, @"[^\p{L}\p{N}\s]", " ");
        normalized = Regex.Replace(normalized, @"\s+", " ").Trim();
        return normalized.Replace('y', 'i');
    }

    private static string CompactLookup(string value)
    {
        return Regex.Replace(NormalizeFriendLookup(value), @"\s+", string.Empty);
    }

    private static int MinLookupDistance(string normalizedTarget, string compactTarget, params string[] candidates)
    {
        var candidateValues = candidates
            .Where(candidate => !string.IsNullOrWhiteSpace(candidate))
            .Distinct(StringComparer.Ordinal)
            .ToArray();

        return candidateValues.Min(candidate =>
        {
            var target = candidate.Contains(' ') ? compactTarget : normalizedTarget;
            var source = candidate.Contains(' ') ? CompactLookup(candidate) : candidate;
            return LevenshteinDistance(source, target);
        });
    }

    private static int GetAllowedLookupDistance(string compactTarget)
    {
        return compactTarget.Length switch
        {
            <= 2 => 1,
            <= 6 => 2,
            _ => 3
        };
    }

    private static int LevenshteinDistance(string left, string right)
    {
        if (string.IsNullOrEmpty(left))
        {
            return right.Length;
        }

        if (string.IsNullOrEmpty(right))
        {
            return left.Length;
        }

        var rows = left.Length + 1;
        var columns = right.Length + 1;
        var distances = new int[rows, columns];

        for (var row = 0; row < rows; row++)
        {
            distances[row, 0] = row;
        }

        for (var column = 0; column < columns; column++)
        {
            distances[0, column] = column;
        }

        for (var row = 1; row < rows; row++)
        {
            for (var column = 1; column < columns; column++)
            {
                var cost = left[row - 1] == right[column - 1] ? 0 : 1;
                distances[row, column] = Math.Min(
                    Math.Min(
                        distances[row - 1, column] + 1,
                        distances[row, column - 1] + 1),
                    distances[row - 1, column - 1] + cost);
            }
        }

        return distances[rows - 1, columns - 1];
    }
}
