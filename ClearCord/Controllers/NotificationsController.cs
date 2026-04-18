using ClearCord.Common.Extensions;
using ClearCord.DTOs;
using ClearCord.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace ClearCord.Controllers;

[ApiController]
[Authorize]
[Route("api/notifications")]
public sealed class NotificationsController(INotificationService notificationService) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IReadOnlyCollection<NotificationDto>>> GetMine(CancellationToken cancellationToken)
    {
        var userId = User.GetRequiredUserId();
        return Ok(await notificationService.GetForUserAsync(userId, cancellationToken));
    }

    [HttpPost("{notificationId:guid}/read")]
    public async Task<IActionResult> MarkRead(Guid notificationId, CancellationToken cancellationToken)
    {
        var userId = User.GetRequiredUserId();
        await notificationService.MarkReadAsync(notificationId, userId, cancellationToken);
        return NoContent();
    }

    [HttpPost("read-all")]
    public async Task<IActionResult> MarkAllRead(CancellationToken cancellationToken)
    {
        var userId = User.GetRequiredUserId();
        await notificationService.MarkAllReadAsync(userId, cancellationToken);
        return NoContent();
    }
}
