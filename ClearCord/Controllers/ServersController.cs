using ClearCord.Common.Extensions;
using ClearCord.DTOs;
using ClearCord.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace ClearCord.Controllers;

[ApiController]
[Authorize]
[Route("api/servers")]
public sealed class ServersController(IServerService serverService) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IReadOnlyCollection<ServerSummaryDto>>> GetMyServers(CancellationToken cancellationToken)
    {
        var userId = User.GetRequiredUserId();
        return Ok(await serverService.GetForUserAsync(userId, cancellationToken));
    }

    [HttpPost]
    public async Task<ActionResult<ServerSummaryDto>> Create([FromBody] CreateServerRequest request, CancellationToken cancellationToken)
    {
        var userId = User.GetRequiredUserId();
        var response = await serverService.CreateAsync(userId, request, cancellationToken);
        return CreatedAtAction(nameof(GetById), new { serverId = response.Id }, response);
    }

    [HttpGet("{serverId:guid}")]
    public async Task<ActionResult<ServerDetailsDto>> GetById(Guid serverId, CancellationToken cancellationToken)
    {
        var userId = User.GetRequiredUserId();
        return Ok(await serverService.GetDetailsAsync(serverId, userId, cancellationToken));
    }

    [HttpPut("{serverId:guid}")]
    public async Task<ActionResult<ServerSummaryDto>> Update(Guid serverId, [FromBody] UpdateServerRequest request, CancellationToken cancellationToken)
    {
        var userId = User.GetRequiredUserId();
        return Ok(await serverService.UpdateAsync(serverId, userId, request, cancellationToken));
    }

    [HttpDelete("{serverId:guid}")]
    public async Task<IActionResult> Delete(Guid serverId, CancellationToken cancellationToken)
    {
        var userId = User.GetRequiredUserId();
        await serverService.DeleteAsync(serverId, userId, cancellationToken);
        return NoContent();
    }

    [HttpPost("join")]
    public async Task<ActionResult<ServerSummaryDto>> Join([FromBody] JoinServerRequest request, CancellationToken cancellationToken)
    {
        var userId = User.GetRequiredUserId();
        return Ok(await serverService.JoinAsync(userId, request, cancellationToken));
    }

    [HttpPost("{serverId:guid}/leave")]
    public async Task<IActionResult> Leave(Guid serverId, CancellationToken cancellationToken)
    {
        var userId = User.GetRequiredUserId();
        await serverService.LeaveAsync(serverId, userId, cancellationToken);
        return NoContent();
    }

    [HttpGet("{serverId:guid}/members")]
    public async Task<ActionResult<IReadOnlyCollection<ServerMemberDto>>> GetMembers(Guid serverId, CancellationToken cancellationToken)
    {
        var userId = User.GetRequiredUserId();
        return Ok(await serverService.GetMembersAsync(serverId, userId, cancellationToken));
    }

    [HttpGet("{serverId:guid}/invite")]
    public async Task<ActionResult<ServerInviteDto>> GetInvite(Guid serverId, CancellationToken cancellationToken)
    {
        var userId = User.GetRequiredUserId();
        return Ok(await serverService.GetInviteAsync(serverId, userId, cancellationToken));
    }

    [HttpPost("{serverId:guid}/roles")]
    public async Task<ActionResult<ServerRoleDto>> CreateRole(Guid serverId, [FromBody] CreateServerRoleRequest request, CancellationToken cancellationToken)
    {
        var userId = User.GetRequiredUserId();
        return Ok(await serverService.CreateRoleAsync(serverId, userId, request, cancellationToken));
    }

    [HttpPost("{serverId:guid}/roles/{roleId:guid}/assign")]
    public async Task<IActionResult> AssignRole(Guid serverId, Guid roleId, [FromBody] AssignServerRoleRequest request, CancellationToken cancellationToken)
    {
        var userId = User.GetRequiredUserId();
        await serverService.AssignRoleAsync(serverId, roleId, userId, request, cancellationToken);
        return NoContent();
    }

    [HttpPost("{serverId:guid}/members/{targetUserId}/kick")]
    public async Task<IActionResult> Kick(Guid serverId, string targetUserId, [FromBody] ModerateMemberRequest request, CancellationToken cancellationToken)
    {
        var userId = User.GetRequiredUserId();
        await serverService.KickMemberAsync(serverId, targetUserId, userId, request, cancellationToken);
        return NoContent();
    }

    [HttpPost("{serverId:guid}/members/{targetUserId}/ban")]
    public async Task<IActionResult> Ban(Guid serverId, string targetUserId, [FromBody] ModerateMemberRequest request, CancellationToken cancellationToken)
    {
        var userId = User.GetRequiredUserId();
        await serverService.BanMemberAsync(serverId, targetUserId, userId, request, cancellationToken);
        return NoContent();
    }
}
