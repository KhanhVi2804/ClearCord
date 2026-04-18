using ClearCord.Common.Extensions;
using ClearCord.DTOs;
using ClearCord.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace ClearCord.Controllers;

[ApiController]
[Authorize]
[Route("api/friends")]
public sealed class FriendsController(IFriendService friendService) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IReadOnlyCollection<FriendDto>>> GetFriends(CancellationToken cancellationToken)
    {
        var userId = User.GetRequiredUserId();
        return Ok(await friendService.GetFriendsAsync(userId, cancellationToken));
    }

    [HttpGet("requests")]
    public async Task<ActionResult<IReadOnlyCollection<FriendRequestDto>>> GetPendingRequests(CancellationToken cancellationToken)
    {
        var userId = User.GetRequiredUserId();
        return Ok(await friendService.GetPendingRequestsAsync(userId, cancellationToken));
    }

    [HttpPost("requests")]
    public async Task<ActionResult<FriendRequestDto>> SendRequest([FromBody] SendFriendRequestRequest request, CancellationToken cancellationToken)
    {
        var userId = User.GetRequiredUserId();
        var response = await friendService.SendRequestAsync(userId, request, cancellationToken);
        return Ok(response);
    }

    [HttpPost("requests/{requestId:guid}/accept")]
    public async Task<ActionResult<FriendRequestDto>> Accept(Guid requestId, CancellationToken cancellationToken)
    {
        var userId = User.GetRequiredUserId();
        return Ok(await friendService.AcceptAsync(userId, requestId, cancellationToken));
    }

    [HttpPost("requests/{requestId:guid}/reject")]
    public async Task<ActionResult<FriendRequestDto>> Reject(Guid requestId, CancellationToken cancellationToken)
    {
        var userId = User.GetRequiredUserId();
        return Ok(await friendService.RejectAsync(userId, requestId, cancellationToken));
    }

    [HttpDelete("{friendUserId}")]
    public async Task<IActionResult> Unfriend(string friendUserId, CancellationToken cancellationToken)
    {
        var userId = User.GetRequiredUserId();
        await friendService.UnfriendAsync(userId, friendUserId, cancellationToken);
        return NoContent();
    }
}
