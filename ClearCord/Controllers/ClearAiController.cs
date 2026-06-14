using ClearCord.Common.Extensions;
using ClearCord.DTOs;
using ClearCord.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace ClearCord.Controllers;

[ApiController]
[Authorize]
[Route("api/clear-ai")]
public sealed class ClearAiController(IClearAiService clearAiService) : ControllerBase
{
    [HttpPost("assist")]
    public async Task<ActionResult<ClearAiResponseDto>> Assist([FromBody] ClearAiRequest request, CancellationToken cancellationToken)
    {
        var userId = User.GetRequiredUserId();
        return Ok(await clearAiService.AssistAsync(userId, request, cancellationToken));
    }
}
