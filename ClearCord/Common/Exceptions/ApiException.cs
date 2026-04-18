namespace ClearCord.Common.Exceptions;

public sealed class ApiException : Exception
{
    public ApiException(string message, int statusCode = StatusCodes.Status400BadRequest)
        : base(message)
    {
        StatusCode = statusCode;
    }

    public int StatusCode { get; }
}
