using ClearCord.Common.Extensions;
using ClearCord.DTOs;
using ClearCord.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace ClearCord.Controllers;

[ApiController]
[Authorize]
public sealed class ChannelsController(IChannelService channelService) : ControllerBase
{
    [HttpPost("api/servers/{serverId:guid}/categories")]
    public async Task<ActionResult<ChannelCategoryDto>> CreateCategory(Guid serverId, [FromBody] CreateCategoryRequest request, CancellationToken cancellationToken)
    {
        var userId = User.GetRequiredUserId();
        return Ok(await channelService.CreateCategoryAsync(serverId, userId, request, cancellationToken));
    }

    [HttpPut("api/categories/{categoryId:guid}")]
    public async Task<ActionResult<ChannelCategoryDto>> UpdateCategory(Guid categoryId, [FromBody] UpdateCategoryRequest request, CancellationToken cancellationToken)
    {
        var userId = User.GetRequiredUserId();
        return Ok(await channelService.UpdateCategoryAsync(categoryId, userId, request, cancellationToken));
    }

    [HttpDelete("api/categories/{categoryId:guid}")]
    public async Task<IActionResult> DeleteCategory(Guid categoryId, CancellationToken cancellationToken)
    {
        var userId = User.GetRequiredUserId();
        await channelService.DeleteCategoryAsync(categoryId, userId, cancellationToken);
        return NoContent();
    }

    [HttpPost("api/servers/{serverId:guid}/channels")]
    public async Task<ActionResult<ChannelDto>> CreateChannel(Guid serverId, [FromBody] CreateChannelRequest request, CancellationToken cancellationToken)
    {
        var userId = User.GetRequiredUserId();
        return Ok(await channelService.CreateChannelAsync(serverId, userId, request, cancellationToken));
    }

    [HttpPut("api/channels/{channelId:guid}")]
    public async Task<ActionResult<ChannelDto>> UpdateChannel(Guid channelId, [FromBody] UpdateChannelRequest request, CancellationToken cancellationToken)
    {
        var userId = User.GetRequiredUserId();
        return Ok(await channelService.UpdateChannelAsync(channelId, userId, request, cancellationToken));
    }

    [HttpDelete("api/channels/{channelId:guid}")]
    public async Task<IActionResult> DeleteChannel(Guid channelId, CancellationToken cancellationToken)
    {
        var userId = User.GetRequiredUserId();
        await channelService.DeleteChannelAsync(channelId, userId, cancellationToken);
        return NoContent();
    }
}
