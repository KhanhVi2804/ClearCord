namespace ClearCord.Entities;

public sealed class ServerRoleAssignment
{
    public Guid Id { get; set; }
    public Guid ServerRoleId { get; set; }
    public string UserId { get; set; } = string.Empty;
    public DateTimeOffset AssignedAt { get; set; } = DateTimeOffset.UtcNow;

    public ServerRole ServerRole { get; set; } = null!;
    public ApplicationUser User { get; set; } = null!;
}
