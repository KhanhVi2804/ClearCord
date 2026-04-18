namespace ClearCord.Entities;

public sealed class RevokedToken
{
    public Guid Id { get; set; }
    public string UserId { get; set; } = string.Empty;
    public string Jti { get; set; } = string.Empty;
    public DateTimeOffset ExpiresAt { get; set; }
    public DateTimeOffset RevokedAt { get; set; } = DateTimeOffset.UtcNow;
}
