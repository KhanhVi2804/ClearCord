using ClearCord.Common.Extensions;
using ClearCord.DTOs;
using ClearCord.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace ClearCord.Controllers;

[ApiController]
[Authorize]
[Route("api/direct-conversations")]
public sealed class DirectConversationsController(
    IDirectConversationService directConversationService,
    IMessageService messageService,
    IDirectVoiceService directVoiceService) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IReadOnlyCollection<DirectConversationDto>>> GetMine(CancellationToken cancellationToken)
    {
        var userId = User.GetRequiredUserId();
        return Ok(await directConversationService.GetForUserAsync(userId, cancellationToken));
    }

    [HttpPost]
    public async Task<ActionResult<DirectConversationDto>> GetOrCreate([FromBody] StartDirectConversationRequest request, CancellationToken cancellationToken)
    {
        var userId = User.GetRequiredUserId();
        return Ok(await directConversationService.GetOrCreateAsync(userId, request, cancellationToken));
    }

    [HttpGet("{conversationId:guid}/messages")]
    public async Task<ActionResult<IReadOnlyCollection<MessageDto>>> GetMessages(
        Guid conversationId,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 50,
        CancellationToken cancellationToken = default)
    {
        var userId = User.GetRequiredUserId();
        return Ok(await messageService.GetDirectConversationMessagesAsync(conversationId, userId, page, pageSize, cancellationToken));
    }

    [HttpPost("{conversationId:guid}/messages")]
    [RequestSizeLimit(25 * 1024 * 1024)]
    public async Task<ActionResult<MessageDto>> CreateMessage(Guid conversationId, [FromForm] CreateMessageRequest request, CancellationToken cancellationToken)
    {
        var userId = User.GetRequiredUserId();
        var response = await messageService.CreateDirectAsync(conversationId, userId, request.Content, request.ReplyToMessageId, request.Files, cancellationToken);
        return Ok(response);
    }

    [HttpGet("{conversationId:guid}/voice/participants")]
    public async Task<ActionResult<IReadOnlyCollection<VoiceParticipantDto>>> GetVoiceParticipants(Guid conversationId, CancellationToken cancellationToken)
    {
        var userId = User.GetRequiredUserId();
        return Ok(await directVoiceService.GetParticipantsAsync(conversationId, userId, cancellationToken));
    }
}
