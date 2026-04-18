using ClearCord.Common.Extensions;
using ClearCord.DTOs;
using ClearCord.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace ClearCord.Controllers;

[ApiController]
[Authorize]
[Route("api/users")]
public sealed class UsersController(IUserService userService) : ControllerBase
{
    [HttpGet("me")]
    public async Task<ActionResult<UserProfileDto>> GetCurrentUser(CancellationToken cancellationToken)
    {
        var userId = User.GetRequiredUserId();
        return Ok(await userService.GetProfileAsync(userId, cancellationToken));
    }

    [HttpPut("me")]
    public async Task<ActionResult<UserProfileDto>> UpdateCurrentUser([FromBody] UpdateProfileRequest request, CancellationToken cancellationToken)
    {
        var userId = User.GetRequiredUserId();
        return Ok(await userService.UpdateProfileAsync(userId, request, cancellationToken));
    }

    [HttpPost("me/avatar")]
    [RequestSizeLimit(20 * 1024 * 1024)]
    public async Task<ActionResult<UserProfileDto>> UploadAvatar([FromForm] IFormFile avatar, CancellationToken cancellationToken)
    {
        var userId = User.GetRequiredUserId();
        return Ok(await userService.UploadAvatarAsync(userId, avatar, cancellationToken));
    }

    [HttpGet("search")]
    public async Task<ActionResult<IReadOnlyCollection<UserSummaryDto>>> Search([FromQuery] string term, CancellationToken cancellationToken)
    {
        var userId = User.GetRequiredUserId();
        return Ok(await userService.SearchAsync(userId, term, cancellationToken));
    }

    [HttpGet("{userId}")]
    public async Task<ActionResult<UserProfileDto>> GetById(string userId, CancellationToken cancellationToken)
    {
        return Ok(await userService.GetProfileAsync(userId, cancellationToken));
    }
}
