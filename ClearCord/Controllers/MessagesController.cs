using ClearCord.Common.Extensions;
using ClearCord.DTOs;
using ClearCord.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace ClearCord.Controllers;

[ApiController]
[Authorize]
public sealed class MessagesController(IMessageService messageService) : ControllerBase
{
    [HttpGet("api/channels/{channelId:guid}/messages")]
    public async Task<ActionResult<IReadOnlyCollection<MessageDto>>> GetChannelMessages(
        Guid channelId,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 50,
        CancellationToken cancellationToken = default)
    {
        var userId = User.GetRequiredUserId();
        return Ok(await messageService.GetChannelMessagesAsync(channelId, userId, page, pageSize, cancellationToken));
    }

    [HttpPost("api/channels/{channelId:guid}/messages")]
    [RequestSizeLimit(25 * 1024 * 1024)]
    public async Task<ActionResult<MessageDto>> CreateMessage(Guid channelId, [FromForm] CreateMessageRequest request, CancellationToken cancellationToken)
    {
        var userId = User.GetRequiredUserId();
        var response = await messageService.CreateAsync(channelId, userId, request.Content, request.ReplyToMessageId, request.Files, cancellationToken);
        return Ok(response);
    }

    [HttpPut("api/messages/{messageId:guid}")]
    public async Task<ActionResult<MessageDto>> UpdateMessage(Guid messageId, [FromBody] UpdateMessageRequest request, CancellationToken cancellationToken)
    {
        var userId = User.GetRequiredUserId();
        return Ok(await messageService.UpdateAsync(messageId, userId, request, cancellationToken));
    }

    [HttpDelete("api/messages/{messageId:guid}")]
    public async Task<IActionResult> DeleteMessage(Guid messageId, CancellationToken cancellationToken)
    {
        var userId = User.GetRequiredUserId();
        await messageService.DeleteAsync(messageId, userId, cancellationToken);
        return NoContent();
    }

    [HttpPost("api/messages/{messageId:guid}/pin")]
    public async Task<ActionResult<MessageDto>> TogglePin(Guid messageId, CancellationToken cancellationToken)
    {
        var userId = User.GetRequiredUserId();
        return Ok(await messageService.TogglePinAsync(messageId, userId, cancellationToken));
    }

    [HttpPost("api/messages/{messageId:guid}/reactions")]
    public async Task<ActionResult<MessageDto>> AddReaction(Guid messageId, [FromBody] ToggleReactionRequest request, CancellationToken cancellationToken)
    {
        var userId = User.GetRequiredUserId();
        return Ok(await messageService.AddReactionAsync(messageId, userId, request, cancellationToken));
    }

    [HttpDelete("api/messages/{messageId:guid}/reactions/{emoji}")]
    public async Task<ActionResult<MessageDto>> RemoveReaction(Guid messageId, string emoji, CancellationToken cancellationToken)
    {
        var userId = User.GetRequiredUserId();
        return Ok(await messageService.RemoveReactionAsync(messageId, userId, emoji, cancellationToken));
    }
}
