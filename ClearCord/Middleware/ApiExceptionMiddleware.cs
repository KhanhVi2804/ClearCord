using System.Net;
using System.Text.Json;
using ClearCord.Common.Exceptions;
using Microsoft.Extensions.Hosting;

namespace ClearCord.Middleware;

public sealed class ApiExceptionMiddleware(
    RequestDelegate next,
    ILogger<ApiExceptionMiddleware> logger,
    IHostEnvironment environment)
{
    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await next(context);
        }
        catch (ApiException exception)
        {
            await WriteResponseAsync(context, exception.StatusCode, exception.Message);
        }
        catch (Exception exception)
        {
            logger.LogError(exception, "Unhandled exception while processing request.");
            var message = environment.IsDevelopment()
                ? exception.GetBaseException().Message
                : "An unexpected error occurred.";

            await WriteResponseAsync(context, StatusCodes.Status500InternalServerError, message);
        }
    }

    private static async Task WriteResponseAsync(HttpContext context, int statusCode, string message)
    {
        context.Response.StatusCode = statusCode;
        context.Response.ContentType = "application/json";

        var payload = JsonSerializer.Serialize(new
        {
            statusCode,
            error = message,
            traceId = context.TraceIdentifier,
            reason = ((HttpStatusCode)statusCode).ToString()
        });

        await context.Response.WriteAsync(payload);
    }
}
