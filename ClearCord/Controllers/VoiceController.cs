using ClearCord.Common.Extensions;
using ClearCord.DTOs;
using ClearCord.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace ClearCord.Controllers;

[ApiController]
[Authorize]
public sealed class VoiceController(IVoiceService voiceService) : ControllerBase
{
    [HttpGet("api/channels/{channelId:guid}/voice/participants")]
    public async Task<ActionResult<IReadOnlyCollection<VoiceParticipantDto>>> GetParticipants(Guid channelId, CancellationToken cancellationToken)
    {
        var userId = User.GetRequiredUserId();
        return Ok(await voiceService.GetParticipantsAsync(channelId, userId, cancellationToken));
    }

    [HttpPost("api/channels/{channelId:guid}/voice/join")]
    public async Task<ActionResult<IReadOnlyCollection<VoiceParticipantDto>>> Join(Guid channelId, [FromBody] JoinVoiceChannelRequest request, CancellationToken cancellationToken)
    {
        var userId = User.GetRequiredUserId();
        return Ok(await voiceService.JoinAsync(channelId, userId, request, cancellationToken));
    }

    [HttpPost("api/channels/{channelId:guid}/voice/leave")]
    public async Task<ActionResult<IReadOnlyCollection<VoiceParticipantDto>>> Leave(Guid channelId, [FromBody] JoinVoiceChannelRequest request, CancellationToken cancellationToken)
    {
        var userId = User.GetRequiredUserId();
        return Ok(await voiceService.LeaveAsync(channelId, userId, request.ConnectionId, cancellationToken));
    }

    [HttpPut("api/channels/{channelId:guid}/voice/state")]
    public async Task<ActionResult<IReadOnlyCollection<VoiceParticipantDto>>> UpdateState(Guid channelId, [FromBody] UpdateVoiceStateRequest request, CancellationToken cancellationToken)
    {
        var userId = User.GetRequiredUserId();
        return Ok(await voiceService.UpdateStateAsync(channelId, userId, request, cancellationToken));
    }
}
